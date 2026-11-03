import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../../../../core/modules/rbac/role.enum.js';
import { ACCESS_TRACE_RETENTION_DAYS } from '../../usecase/user-access-trace.service.js';
import { TRACE_OTHER_ACCOUNTS_LIMIT } from '../../user.constants.js';
import { ProfileModel } from '../models/profile.model.js';
import { UserAccessTraceModel } from '../models/user-access-trace.model.js';
import { bannedSql } from './user-banned.sql.js';

export type UserAccessTraceAccountRow = {
    userId: string;
    username: string;
    role: string;
    banned: boolean;
};

/** 同じ手がかり（IPv4 は完全一致・IPv6 は /64）ごとの 1 行。otherAccounts は対象を除く */
export type UserAccessTraceRow = {
    ip: string;
    userAgents: string[];
    count: number;
    lastSeenAt: Date;
    /** この手がかりを使ったアカウントの数（対象を含む） */
    accountCount: number;
    otherAccounts: UserAccessTraceAccountRow[];
};

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * 「同じ手がかり」の IP。IPv6 は /64 の網（'2001:db8:1:2::/64'）・IPv4 はそのアドレス。
 * inet のまま ::text にすると IPv4 に /32 が付くので、IPv4 は host() で文字にする
 */
const TRACE_BUCKET_SQL =
    'CASE WHEN family("t"."ip") = 6 THEN network(set_masklen("t"."ip", 64))::text ELSE host("t"."ip") END';

@Injectable()
export class UserAccessTraceQuery {
    constructor(
        @InjectRepository(UserAccessTraceModel)
        private readonly traceRepository: Repository<UserAccessTraceModel>,
    ) {}

    /**
     * 対象のアカウントが 90 日以内に使った手がかり（IP）ごとに、回数・端末・最後に見た日時と、
     * 同じ手がかりを使った他のアカウント（最大 TRACE_OTHER_ACCOUNTS_LIMIT 件）を返す。新しい手がかりが先。
     * 他のアカウントの探し方: IPv4 は完全一致、IPv6 は /64 の一致（<<= で網に含まれるかを見る）。
     */
    async findTraces(params: {
        userId: string;
        now?: Date;
    }): Promise<UserAccessTraceRow[]> {
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
                    .addSelect(bannedSql(sub), 'banned')
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
}
