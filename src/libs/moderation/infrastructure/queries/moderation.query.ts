import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { OperationSightingAuthorModel } from '../../../operation-sighting/infrastructure/models/operation-sighting-author.model.js';
import { OperationSightingInvalidationModel } from '../../../operation-sighting/infrastructure/models/operation-sighting-invalidation.model.js';
import { OperationSightingManagementLogModel } from '../../../operation-sighting/infrastructure/models/operation-sighting-management-log.model.js';
import { OperationSightingModel } from '../../../operation-sighting/infrastructure/models/operation-sighting.model.js';
import { ProfileModel } from '../../../user/infrastructure/models/profile.model.js';
import { Role } from '../../../../core/modules/rbac/role.enum.js';
import {
    BURST_COUNT,
    BURST_WINDOW_MINUTES,
    NEW_ACCOUNT_HOURS,
} from '../../moderation.constants.js';

export type ModerationUserSummaryRow = {
    userId: string;
    username: string;
    displayName: string;
    role: string;
    createdAt: Date;
    sightingCount: number;
    invalidatedCount: number;
    firstSightingAt: Date | null;
    lastSightingAt: Date | null;
};

export type ModerationSightingRow = {
    operationSightingId: string;
    sightingTime: Date;
    createdAt: Date;
    operationNumber: string;
    formationNumber: string;
    invalidated: boolean;
    invalidatedByUserId: string | null;
    invalidatedByUsername: string | null;
};

export type ModerationRecentSightingRow = ModerationSightingRow & {
    /** ゲストの目撃は null */
    author: {
        userId: string;
        username: string;
        displayName: string;
        role: string;
        newAccount: boolean;
        burst: boolean;
    } | null;
};

/**
 * 印（newAccount・burst）を付ける投稿者の役割。信頼済みの editor・manager は連投しても普通の作業なので常に false
 */
const MARKED_ROLES: readonly string[] = [Role.REPORTER, Role.VIEWER];

/** 無効化の取り消し（復元）は行を消すので、行があれば今も無効 */
const INVALIDATION_ACTION = 'invalidation';

@Injectable()
export class ModerationQuery {
    constructor(
        @InjectRepository(OperationSightingModel)
        private readonly operationSightingRepository: Repository<OperationSightingModel>,
        @InjectRepository(OperationSightingAuthorModel)
        private readonly authorRepository: Repository<OperationSightingAuthorModel>,
        @InjectRepository(ProfileModel)
        private readonly profileRepository: Repository<ProfileModel>,
    ) {}

    /** profiles が無ければ null。投稿数などは operation_sighting_authors（登録制の目撃）だけ数える */
    async findUserSummary(params: {
        userId: string;
    }): Promise<ModerationUserSummaryRow | null> {
        const raw = await this.profileRepository
            .createQueryBuilder('p')
            .leftJoin(OperationSightingAuthorModel, 'a', 'a.userId = p.userId')
            .leftJoin(
                OperationSightingModel,
                's',
                's.id = a.operationSightingId',
            )
            .leftJoin(
                OperationSightingInvalidationModel,
                'i',
                'i.operationSightingId = s.id',
            )
            .select('p.userId', 'userId')
            .addSelect('p.username', 'username')
            .addSelect('p.displayName', 'displayName')
            .addSelect('p.role', 'role')
            .addSelect('p.createdAt', 'createdAt')
            .addSelect('COUNT(DISTINCT s.id)', 'sightingCount')
            .addSelect(
                'COUNT(DISTINCT i.operationSightingId)',
                'invalidatedCount',
            )
            .addSelect('MIN(s.createdAt)', 'firstSightingAt')
            .addSelect('MAX(s.createdAt)', 'lastSightingAt')
            .where('p.userId = :userId', { userId: params.userId })
            .groupBy('p.userId')
            .getRawOne();

        if (!raw) {
            return null;
        }

        return {
            userId: raw.userId,
            username: raw.username,
            displayName: raw.displayName,
            role: raw.role,
            createdAt: raw.createdAt,
            sightingCount: Number(raw.sightingCount),
            invalidatedCount: Number(raw.invalidatedCount),
            firstSightingAt: raw.firstSightingAt ?? null,
            lastSightingAt: raw.lastSightingAt ?? null,
        };
    }

    /** 投稿者の目撃を created_at の新しい順に */
    async findSightingsByUser(params: {
        userId: string;
        limit: number;
        before: Date | null;
    }): Promise<ModerationSightingRow[]> {
        const qb = this.buildSightingList({
            limit: params.limit,
            before: params.before,
        }).innerJoin(
            OperationSightingAuthorModel,
            'a',
            'a.operationSightingId = s.id AND a.userId = :userId',
            { userId: params.userId },
        );

        const rows = await qb.getRawMany();

        return rows.map(toSightingRow);
    }

    /** 投稿者の行が無ければ（ゲスト・2026-10-23 より前）null */
    async findAuthorUserId(params: {
        operationSightingId: string;
    }): Promise<string | null> {
        const raw = await this.authorRepository
            .createQueryBuilder('a')
            .select('a.userId', 'userId')
            .where('a.operationSightingId = :operationSightingId', {
                operationSightingId: params.operationSightingId,
            })
            .getRawOne();

        return raw?.userId ?? null;
    }

    /**
     * 新着の目撃を投稿者つきで created_at の新しい順に（ゲストも含む）。
     * 印は投稿者の役割が reporter・viewer のときだけ計算する（editor・manager は常に false）。
     * newAccount: その目撃が、投稿者の登録から NEW_ACCOUNT_HOURS 時間以内。
     * burst: その目撃までの BURST_WINDOW_MINUTES 分（その目撃を含む）に、同じ人の投稿が BURST_COUNT 件以上。
     */
    async findRecentSightings(params: {
        limit: number;
        before: Date | null;
    }): Promise<ModerationRecentSightingRow[]> {
        const qb = this.buildSightingList(params)
            .leftJoin(
                OperationSightingAuthorModel,
                'a',
                'a.operationSightingId = s.id',
            )
            .leftJoin(ProfileModel, 'ap', 'ap.userId = a.userId')
            .addSelect('a.userId', 'authorUserId')
            .addSelect('ap.username', 'authorUsername')
            .addSelect('ap.displayName', 'authorDisplayName')
            .addSelect('ap.role', 'authorRole')
            .addSelect(
                `CASE WHEN "ap"."role" IN (:...markedRoles) THEN "s"."created_at" < "ap"."created_at" + interval '1 hour' * :newAccountHours ELSE false END`,
                'newAccount',
            )
            .setParameter('newAccountHours', NEW_ACCOUNT_HOURS)
            .setParameter('markedRoles', MARKED_ROLES);

        const burstCount = qb
            .subQuery()
            .select('COUNT(*)')
            .from(OperationSightingAuthorModel, 'a2')
            .innerJoin(
                OperationSightingModel,
                's2',
                's2.id = a2.operationSightingId',
            )
            .where('a2.userId = "a"."user_id"')
            .andWhere('s2.createdAt <= "s"."created_at"')
            .andWhere(
                `s2.createdAt > "s"."created_at" - interval '1 minute' * :burstWindowMinutes`,
            )
            .getQuery();
        qb.addSelect(
            `CASE WHEN "ap"."role" IN (:...markedRoles) THEN ${burstCount} >= :burstCount ELSE false END`,
            'burst',
        )
            .setParameter('burstWindowMinutes', BURST_WINDOW_MINUTES)
            .setParameter('burstCount', BURST_COUNT);

        const rows = await qb.getRawMany();

        return rows.map((raw) => {
            const marked = MARKED_ROLES.includes(raw.authorRole);

            return {
                ...toSightingRow(raw),
                author: raw.authorUserId
                    ? {
                          userId: raw.authorUserId,
                          username: raw.authorUsername ?? '',
                          displayName: raw.authorDisplayName ?? '',
                          role: raw.authorRole ?? '',
                          newAccount: marked && raw.newAccount === true,
                          burst: marked && raw.burst === true,
                      }
                    : null,
            };
        });
    }

    /**
     * 目撃の一覧の共通部分（運用・編成・無効化の有無と無効化した人・新しい順・limit・before）。
     * 無効化した人は、今も無効な目撃について直近の invalidation のログから引く。
     */
    private buildSightingList(params: {
        limit: number;
        before: Date | null;
    }): SelectQueryBuilder<OperationSightingModel> {
        const qb = this.operationSightingRepository
            .createQueryBuilder('s')
            .innerJoin('s.operation', 'o')
            .innerJoin('s.formation', 'f');

        const invalidationExists = qb
            .subQuery()
            .select('1')
            .from(OperationSightingInvalidationModel, 'inv')
            .where('inv.operationSightingId = "s"."id"')
            .getQuery();
        const latestInvalidationLog = qb
            .subQuery()
            .select('l.id')
            .from(OperationSightingManagementLogModel, 'l')
            .where('l.operationSightingId = "s"."id"')
            .andWhere('l.action = :invalidationAction')
            .orderBy('l.createdAt', 'DESC')
            .limit(1)
            .getQuery();

        qb.leftJoin(
            OperationSightingManagementLogModel,
            'lg',
            `lg.id = ${latestInvalidationLog} AND EXISTS ${invalidationExists}`,
        )
            .leftJoin(ProfileModel, 'ip', 'ip.userId = lg.userId')
            .select('s.id', 'operationSightingId')
            .addSelect('s.sightingTime', 'sightingTime')
            .addSelect('s.createdAt', 'createdAt')
            .addSelect('o.operationNumber', 'operationNumber')
            .addSelect('f.formationNumber', 'formationNumber')
            .addSelect(`EXISTS ${invalidationExists}`, 'invalidated')
            .addSelect('lg.userId', 'invalidatedByUserId')
            .addSelect('ip.username', 'invalidatedByUsername')
            .setParameter('invalidationAction', INVALIDATION_ACTION)
            .orderBy('s.createdAt', 'DESC')
            .addOrderBy('s.id', 'DESC')
            .limit(params.limit);

        if (params.before) {
            qb.andWhere('s.createdAt < :before', { before: params.before });
        }

        return qb;
    }
}

function toSightingRow(raw: Record<string, any>): ModerationSightingRow {
    return {
        operationSightingId: raw.operationSightingId,
        sightingTime: raw.sightingTime,
        createdAt: raw.createdAt,
        operationNumber: raw.operationNumber,
        formationNumber: raw.formationNumber,
        invalidated: raw.invalidated === true,
        invalidatedByUserId: raw.invalidatedByUserId ?? null,
        invalidatedByUsername: raw.invalidatedByUsername ?? null,
    };
}
