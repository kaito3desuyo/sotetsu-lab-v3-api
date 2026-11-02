import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository, SelectQueryBuilder } from 'typeorm';
import { OperationSightingAuthorModel } from '../../../operation-sighting/infrastructure/models/operation-sighting-author.model.js';
import { OperationSightingInvalidationModel } from '../../../operation-sighting/infrastructure/models/operation-sighting-invalidation.model.js';
import { OperationSightingManagementLogModel } from '../../../operation-sighting/infrastructure/models/operation-sighting-management-log.model.js';
import { OperationSightingModel } from '../../../operation-sighting/infrastructure/models/operation-sighting.model.js';
import { ProfileModel } from '../../../user/infrastructure/models/profile.model.js';
import { ACCESS_TRACE_RETENTION_DAYS } from '../../../../core/modules/access-trace/access-traces.js';
import { UserAccessTraceModel } from '../../../../core/modules/access-trace/user-access-trace.model.js';
import { Role } from '../../../../core/modules/rbac/role.enum.js';
import {
    BURST_COUNT,
    BURST_WINDOW_MINUTES,
    NEW_ACCOUNT_HOURS,
    TRACE_OTHER_ACCOUNTS_LIMIT,
} from '../../moderation.constants.js';
import { UserRoleChangeModel } from '../models/user-role-change.model.js';

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
    /** 今 viewer で、かつ viewer にした記録（user_role_changes）がある */
    banned: boolean;
};

/** BAN・解除の対象。lastBanFromRole は直近の BAN（to_role = viewer）の from_role */
export type ModerationTargetRow = {
    userId: string;
    role: string;
    lastBanFromRole: string | null;
};

export type ModerationTraceAccountRow = {
    userId: string;
    username: string;
    role: string;
    banned: boolean;
};

/** 同じ手がかり（IPv4 は完全一致・IPv6 は /64）ごとの 1 行。otherAccounts は対象を除く */
export type ModerationTraceRow = {
    ip: string;
    userAgents: string[];
    count: number;
    lastSeenAt: Date;
    /** この手がかりを使ったアカウントの数（対象を含む） */
    accountCount: number;
    otherAccounts: ModerationTraceAccountRow[];
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

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * 「同じ手がかり」の IP。IPv6 は /64 の網（'2001:db8:1:2::/64'）・IPv4 はそのアドレス。
 * inet のまま ::text にすると IPv4 に /32 が付くので、IPv4 は host() で文字にする
 */
const TRACE_BUCKET_SQL =
    'CASE WHEN family("t"."ip") = 6 THEN network(set_masklen("t"."ip", 64))::text ELSE host("t"."ip") END';

@Injectable()
export class ModerationQuery {
    constructor(
        @InjectRepository(OperationSightingModel)
        private readonly operationSightingRepository: Repository<OperationSightingModel>,
        @InjectRepository(OperationSightingAuthorModel)
        private readonly authorRepository: Repository<OperationSightingAuthorModel>,
        @InjectRepository(ProfileModel)
        private readonly profileRepository: Repository<ProfileModel>,
        @InjectRepository(UserAccessTraceModel)
        private readonly traceRepository: Repository<UserAccessTraceModel>,
    ) {}

    /** profiles が無ければ null。投稿数などは operation_sighting_authors（登録制の目撃）だけ数える */
    async findUserSummary(params: {
        userId: string;
    }): Promise<ModerationUserSummaryRow | null> {
        const qb = this.profileRepository.createQueryBuilder('p');
        const raw = await qb
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
            .addSelect(this.bannedSql(qb), 'banned')
            .setParameter('viewerRole', Role.VIEWER)
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
            banned: raw.banned === true,
        };
    }

    /**
     * BAN・解除の対象を行ロックして引く（同じ人への同時の BAN で記録が二重にならないように）。
     * 呼び出し側のトランザクションの manager で流す。profiles が無ければ null
     */
    async findModerationTarget(
        params: { userId: string },
        manager: EntityManager,
    ): Promise<ModerationTargetRow | null> {
        const qb = manager.createQueryBuilder(ProfileModel, 'p');
        const lastBanFromRole = qb
            .subQuery()
            .select('rc.fromRole')
            .from(UserRoleChangeModel, 'rc')
            .where('rc.userId = "p"."user_id"')
            .andWhere('rc.toRole = :viewerRole')
            .orderBy('rc.createdAt', 'DESC')
            .addOrderBy('rc.id', 'DESC')
            .limit(1)
            .getQuery();

        const raw = await qb
            .select('p.userId', 'userId')
            .addSelect('p.role', 'role')
            .addSelect(lastBanFromRole, 'lastBanFromRole')
            .setParameter('viewerRole', Role.VIEWER)
            .where('p.userId = :userId', { userId: params.userId })
            .setLock('pessimistic_write')
            .getRawOne();

        if (!raw) {
            return null;
        }

        return {
            userId: raw.userId,
            role: raw.role,
            lastBanFromRole: raw.lastBanFromRole ?? null,
        };
    }

    /**
     * 対象のアカウントが 90 日以内に使った手がかり（IP）ごとに、回数・端末・最後に見た日時と、
     * 同じ手がかりを使った他のアカウント（最大 TRACE_OTHER_ACCOUNTS_LIMIT 件）を返す。新しい手がかりが先。
     * 他のアカウントの探し方: IPv4 は完全一致、IPv6 は /64 の一致（<<= で網に含まれるかを見る）。
     */
    async findTraces(params: {
        userId: string;
        now?: Date;
    }): Promise<ModerationTraceRow[]> {
        const cutoff = new Date(
            (params.now ?? new Date()).getTime() -
                ACCESS_TRACE_RETENTION_DAYS * DAY_MS,
        );

        const own = await this.traceRepository
            .createQueryBuilder('t')
            .select(TRACE_BUCKET_SQL, 'ip')
            .addSelect(
                'array_agg(DISTINCT t.userAgent) FILTER (WHERE t.userAgent IS NOT NULL)',
                'userAgents',
            )
            .addSelect('COUNT(*)', 'count')
            .addSelect('MAX(t.createdAt)', 'lastSeenAt')
            .where('t.userId = :userId', { userId: params.userId })
            .andWhere('t.createdAt >= :cutoff', { cutoff })
            .groupBy(TRACE_BUCKET_SQL)
            .orderBy('"lastSeenAt"', 'DESC')
            .getRawMany();

        if (own.length === 0) {
            return [];
        }

        const others = await this.findOtherAccountsByTrace({
            userId: params.userId,
            cutoff,
            buckets: own.map((raw) => raw.ip as string),
        });

        return own.map((raw) => {
            const found = others.filter((row) => row.ip === raw.ip);

            return {
                ip: raw.ip,
                userAgents: raw.userAgents ?? [],
                count: Number(raw.count),
                lastSeenAt: raw.lastSeenAt,
                accountCount:
                    found.length > 0 ? Number(found[0].accountCount) : 1,
                otherAccounts: found.map((row) => ({
                    userId: row.userId,
                    username: row.username,
                    role: row.role,
                    banned: row.banned === true,
                })),
            };
        });
    }

    /**
     * 手がかり（網）ごとに、そこを使ったアカウントを 1 人 1 行にして、対象を除いて最近の順に上位だけ返す。
     * accountCount は対象を含む人数（窓関数で数えてから対象の行を外す）
     */
    private async findOtherAccountsByTrace(params: {
        userId: string;
        cutoff: Date;
        buckets: string[];
    }): Promise<Record<string, any>[]> {
        const qb = this.traceRepository.manager
            .createQueryBuilder()
            .select('"x"."ip"', 'ip')
            .addSelect('"x"."user_id"', 'userId')
            .addSelect('"x"."username"', 'username')
            .addSelect('"x"."role"', 'role')
            .addSelect('"x"."banned"', 'banned')
            .addSelect('"x"."account_count"', 'accountCount')
            .from((sub) => {
                const inner = sub
                    .subQuery()
                    .select(TRACE_BUCKET_SQL, 'ip')
                    .addSelect('t.userId', 'user_id')
                    .addSelect('p.username', 'username')
                    .addSelect('p.role', 'role')
                    .addSelect(this.bannedSql(sub), 'banned')
                    .addSelect(
                        `COUNT(*) OVER (PARTITION BY ${TRACE_BUCKET_SQL})`,
                        'account_count',
                    )
                    .addSelect(
                        `ROW_NUMBER() OVER (PARTITION BY ${TRACE_BUCKET_SQL} ORDER BY ("t"."user_id" = :userId) ASC, MAX("t"."created_at") DESC, "t"."user_id")`,
                        'rn',
                    )
                    .from(UserAccessTraceModel, 't')
                    .innerJoin(ProfileModel, 'p', 'p.userId = t.userId')
                    .where('t.createdAt >= :cutoff')
                    .andWhere('"t"."ip" <<= ANY(CAST(:buckets AS inet[]))')
                    .groupBy(TRACE_BUCKET_SQL)
                    .addGroupBy('t.userId')
                    .addGroupBy('p.userId')
                    .addGroupBy('p.username')
                    .addGroupBy('p.role');

                return inner;
            }, 'x')
            .where('"x"."user_id" <> :userId')
            .andWhere('"x"."rn" <= :otherLimit')
            .orderBy('"x"."ip"', 'ASC')
            .addOrderBy('"x"."rn"', 'ASC')
            .setParameters({
                userId: params.userId,
                cutoff: params.cutoff,
                buckets: params.buckets,
                otherLimit: TRACE_OTHER_ACCOUNTS_LIMIT,
                viewerRole: Role.VIEWER,
            });

        return qb.getRawMany();
    }

    /**
     * 「BAN されている」の定義（1 か所）: 今 viewer で、かつ viewer にした記録がある。
     * 記録の無い viewer（SQL で直した人など）は BAN とは呼ばない。:viewerRole を呼び出し側で渡す。
     * 親の profiles は alias "p"
     */
    private bannedSql(qb: SelectQueryBuilder<any>): string {
        const exists = qb
            .subQuery()
            .select('1')
            .from(UserRoleChangeModel, 'rc')
            .where('rc.userId = "p"."user_id"')
            .andWhere('rc.toRole = :viewerRole')
            .getQuery();

        return `"p"."role" = :viewerRole AND EXISTS ${exists}`;
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
