import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { ProfileModel } from '../../../user/infrastructure/models/profile.model.js';
import { OperationSightingAuthorModel } from '../models/operation-sighting-author.model.js';
import { OperationSightingInvalidationModel } from '../models/operation-sighting-invalidation.model.js';
import { OperationSightingManagementLogModel } from '../models/operation-sighting-management-log.model.js';
import { OperationSightingModel } from '../models/operation-sighting.model.js';

export type OperationSightingSummaryRow = {
    operationSightingId: string;
    sightingTime: Date;
    createdAt: Date;
    operationNumber: string;
    formationNumber: string;
    invalidated: boolean;
    invalidatedByUserId: string | null;
    invalidatedByUsername: string | null;
};

export type OperationSightingRecentRow = OperationSightingSummaryRow & {
    /** ゲストの目撃は null。印（newAccount・burst）の判定は読み取り側（SightingAuthorMarks）が事実から行う */
    author: {
        userId: string;
        username: string;
        displayName: string;
        role: string;
        /** 投稿者の登録日時（profiles.created_at） */
        registeredAt: Date;
        /** その目撃までの burstWindowMinutes 分（その目撃を含む）の、同じ人の投稿数 */
        recentPostCount: number;
    } | null;
};

/** 無効化の取り消し（復元）は行を消すので、行があれば今も無効 */
const INVALIDATION_ACTION = 'invalidation';

@Injectable()
export class OperationSightingAuthorQuery {
    constructor(
        @InjectRepository(OperationSightingModel)
        private readonly operationSightingRepository: Repository<OperationSightingModel>,
        @InjectRepository(OperationSightingAuthorModel)
        private readonly authorRepository: Repository<OperationSightingAuthorModel>,
    ) {}

    /** 投稿者の目撃を created_at の新しい順に */
    async findManyByUserId(params: {
        userId: string;
        limit: number;
        before: Date | null;
    }): Promise<OperationSightingSummaryRow[]> {
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
     * 印の判定はしない。事実だけを返す: 投稿者の役割・登録日時・その目撃までの burstWindowMinutes 分
     * （その目撃を含む）の同じ人の投稿数。窓の長さは数えるのに要るので呼び出し側から受け取る。
     */
    async findManyRecent(params: {
        limit: number;
        before: Date | null;
        burstWindowMinutes: number;
    }): Promise<OperationSightingRecentRow[]> {
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
            .addSelect('ap.createdAt', 'authorRegisteredAt');

        const recentPostCount = qb
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
        qb.addSelect(recentPostCount, 'recentPostCount').setParameter(
            'burstWindowMinutes',
            params.burstWindowMinutes,
        );

        const rows = await qb.getRawMany();

        return rows.map((raw) => ({
            ...toSightingRow(raw),
            author: raw.authorUserId
                ? {
                      userId: raw.authorUserId,
                      username: raw.authorUsername ?? '',
                      displayName: raw.authorDisplayName ?? '',
                      role: raw.authorRole ?? '',
                      registeredAt: raw.authorRegisteredAt,
                      recentPostCount: Number(raw.recentPostCount),
                  }
                : null,
        }));
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

function toSightingRow(raw: Record<string, any>): OperationSightingSummaryRow {
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
