import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, SelectQueryBuilder } from 'typeorm';
import { ENTITIES } from '../../../../core/configs/entities.js';
import { TypeOrmNamingStrategy } from '../../../../core/configs/typeorm-naming-strategy.js';
import { OperationSightingAuthorModel } from '../../../operation-sighting/infrastructure/models/operation-sighting-author.model.js';
import { OperationSightingModel } from '../../../operation-sighting/infrastructure/models/operation-sighting.model.js';
import { ProfileModel } from '../../../user/infrastructure/models/profile.model.js';
import { UserAccessTraceModel } from '../../../../core/modules/access-trace/user-access-trace.model.js';
import {
    BURST_COUNT,
    BURST_WINDOW_MINUTES,
    NEW_ACCOUNT_HOURS,
    TRACE_OTHER_ACCOUNTS_LIMIT,
} from '../../moderation.constants.js';
import { ModerationQuery } from './moderation.query.js';

/**
 * DB には繋がずに、TypeORM が組み立てる SQL とパラメータを見る。
 * 実行（getRawMany / getRawOne）だけを差し替えて、その時点の SQL を取る。
 */
describe('ModerationQuery（生成される SQL）', () => {
    let dataSource: DataSource;
    let query: ModerationQuery;
    let captured: { sql: string; parameters: unknown[] }[];
    let rawRows: Record<string, unknown>[];
    /** 1 回目・2 回目…の実行ごとに返す行。空になったら rawRows を返す */
    let rawQueue: Record<string, unknown>[][];

    beforeAll(async () => {
        dataSource = new DataSource({
            type: 'postgres',
            entities: ENTITIES,
            namingStrategy: new TypeOrmNamingStrategy(),
        });
        await (dataSource as any).buildMetadatas();
        const module = await Test.createTestingModule({
            providers: [
                ModerationQuery,
                {
                    provide: getRepositoryToken(OperationSightingModel),
                    useValue: dataSource.getRepository(OperationSightingModel),
                },
                {
                    provide: getRepositoryToken(OperationSightingAuthorModel),
                    useValue: dataSource.getRepository(
                        OperationSightingAuthorModel,
                    ),
                },
                {
                    provide: getRepositoryToken(ProfileModel),
                    useValue: dataSource.getRepository(ProfileModel),
                },
                {
                    provide: getRepositoryToken(UserAccessTraceModel),
                    useValue: dataSource.getRepository(UserAccessTraceModel),
                },
            ],
        }).compile();
        query = module.get(ModerationQuery);
    });

    beforeEach(() => {
        captured = [];
        rawRows = [];
        rawQueue = [];
        const capture = function (this: SelectQueryBuilder<any>) {
            const [sql, parameters] = this.getQueryAndParameters();
            captured.push({ sql, parameters });
            return Promise.resolve(rawQueue.shift() ?? rawRows);
        };
        vi.spyOn(SelectQueryBuilder.prototype, 'getRawMany').mockImplementation(
            capture as any,
        );
        vi.spyOn(SelectQueryBuilder.prototype, 'getRawOne').mockImplementation(
            async function (this: SelectQueryBuilder<any>) {
                const rows = await capture.call(this);
                return rows[0];
            } as any,
        );
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('投稿者の目撃は created_at の新しい順に、limit つきで引く', async () => {
        await query.findSightingsByUser({
            userId: 'user-1',
            limit: 100,
            before: null,
        });

        const { sql, parameters } = captured[0];
        expect(sql).toContain('"a"."user_id" = $');
        expect(sql).toMatch(/ORDER BY "s"\."created_at" DESC, "s"\."id" DESC/);
        expect(sql).toMatch(/LIMIT 100$/);
        expect(sql).not.toContain('"s"."created_at" <');
        expect(parameters).toContain('user-1');
    });

    it('before があれば created_at がそれより前のものだけ引く', async () => {
        const before = new Date('2026-11-01T00:00:00.000Z');
        await query.findSightingsByUser({
            userId: 'user-1',
            limit: 50,
            before,
        });

        const { sql, parameters } = captured[0];
        expect(sql).toContain('"s"."created_at" < $');
        expect(sql).toMatch(/LIMIT 50$/);
        expect(parameters).toContain(before);
    });

    it('無効化は NOT EXISTS でなく EXISTS で真偽を取り、無効化した人は直近の invalidation のログから引く', async () => {
        await query.findSightingsByUser({
            userId: 'user-1',
            limit: 100,
            before: null,
        });

        const { sql, parameters } = captured[0];
        expect(sql).toContain(
            'EXISTS (SELECT 1 FROM "operation_sighting_invalidations"',
        );
        expect(sql).toContain('FROM "operation_sighting_management_logs"');
        expect(sql).toMatch(/ORDER BY "l"\."created_at" DESC LIMIT 1/);
        expect(parameters).toContain('invalidation');
    });

    it('新着は投稿者を LEFT JOIN で引く（ゲストの目撃も残る）', async () => {
        await query.findRecentSightings({ limit: 100, before: null });

        const { sql } = captured[0];
        expect(sql).toMatch(
            /LEFT JOIN "operation_sighting_authors" "a" ON "a"\."operation_sighting_id" = "s"\."id"/,
        );
        expect(sql).toMatch(/LEFT JOIN "profiles" "ap"/);
        expect(sql).toMatch(/ORDER BY "s"\."created_at" DESC, "s"\."id" DESC/);
    });

    it('新着の burst は、その目撃までの 60 分に同じ人の投稿が 5 件以上', async () => {
        await query.findRecentSightings({ limit: 100, before: null });

        const { sql, parameters } = captured[0];
        expect(sql).toContain('FROM "operation_sighting_authors" "a2"');
        expect(sql).toContain('"a2"."user_id" = "a"."user_id"');
        expect(sql).toContain('"s2"."created_at" <= "s"."created_at"');
        expect(sql).toMatch(/interval '1 minute' \* \$\d+/);
        expect(sql).toMatch(/>= \$\d+/);
        expect(parameters).toContain(BURST_WINDOW_MINUTES);
        expect(parameters).toContain(BURST_COUNT);
    });

    it('新着の newAccount は、その目撃が登録から 24 時間以内', async () => {
        await query.findRecentSightings({ limit: 100, before: null });

        const { sql, parameters } = captured[0];
        expect(sql).toMatch(
            /"s"\."created_at" < "ap"\."created_at" \+ interval '1 hour' \* \$\d+/,
        );
        expect(parameters).toContain(NEW_ACCOUNT_HOURS);
    });

    it('印は reporter・viewer の投稿者だけ計算する（SQL の CASE）', async () => {
        await query.findRecentSightings({ limit: 100, before: null });

        const { sql, parameters } = captured[0];
        expect(sql).toMatch(
            /CASE WHEN "ap"\."role" IN \(\$\d+, \$\d+\) THEN "s"\."created_at" < .* ELSE false END AS "newAccount"/,
        );
        expect(sql).toMatch(
            /CASE WHEN "ap"\."role" IN \(\$\d+, \$\d+\) THEN \(SELECT COUNT\(\*\).* ELSE false END AS "burst"/,
        );
        expect(parameters).toContain('reporter');
        expect(parameters).toContain('viewer');
        expect(parameters).not.toContain('editor');
        expect(parameters).not.toContain('manager');
    });

    it.each(['editor', 'manager'])(
        '%s の投稿者は burst も newAccount も false（行が true を返しても落とす）',
        async (role) => {
            rawRows = [
                {
                    operationSightingId: 's-1',
                    sightingTime: new Date('2026-11-02T01:00:00.000Z'),
                    createdAt: new Date('2026-11-02T01:05:00.000Z'),
                    operationNumber: '41',
                    formationNumber: '8701',
                    invalidated: false,
                    authorUserId: 'u-1',
                    authorUsername: 'alice',
                    authorDisplayName: 'Alice',
                    authorRole: role,
                    newAccount: true,
                    burst: true,
                },
            ];
            const [row] = await query.findRecentSightings({
                limit: 100,
                before: null,
            });
            expect(row.author).toMatchObject({
                role,
                newAccount: false,
                burst: false,
            });
        },
    );

    it('reporter の投稿者は SQL の印をそのまま返す', async () => {
        rawRows = [
            {
                operationSightingId: 's-1',
                sightingTime: new Date('2026-11-02T01:00:00.000Z'),
                createdAt: new Date('2026-11-02T01:05:00.000Z'),
                operationNumber: '41',
                formationNumber: '8701',
                invalidated: false,
                authorUserId: 'u-1',
                authorRole: 'reporter',
                newAccount: true,
                burst: true,
            },
        ];
        const [row] = await query.findRecentSightings({
            limit: 100,
            before: null,
        });
        expect(row.author).toMatchObject({ newAccount: true, burst: true });
    });

    it('目撃の投稿者は operation_sighting_authors から引く', async () => {
        rawRows = [{ userId: 'user-1' }];
        const result = await query.findAuthorUserId({
            operationSightingId: 'sighting-1',
        });

        const { sql, parameters } = captured[0];
        expect(sql).toContain('FROM "operation_sighting_authors" "a"');
        expect(sql).toContain('"a"."operation_sighting_id" = $1');
        expect(parameters).toEqual(['sighting-1']);
        expect(result).toBe('user-1');
    });

    it('目撃に投稿者の行が無ければ null', async () => {
        const result = await query.findAuthorUserId({
            operationSightingId: 'sighting-1',
        });
        expect(result).toBeNull();
    });

    it('投稿者の要約は profiles を軸に、投稿数・無効化された数・最初と最後の投稿を集計する', async () => {
        rawRows = [
            {
                userId: 'user-1',
                username: 'alice',
                displayName: 'Alice',
                role: 'reporter',
                createdAt: new Date('2026-10-30T00:00:00.000Z'),
                sightingCount: '12',
                invalidatedCount: '3',
                firstSightingAt: new Date('2026-10-30T01:00:00.000Z'),
                lastSightingAt: new Date('2026-11-02T01:00:00.000Z'),
                banned: false,
            },
        ];
        const result = await query.findUserSummary({ userId: 'user-1' });

        const { sql, parameters } = captured[0];
        expect(sql).toContain('FROM "profiles" "p"');
        expect(sql).toContain('COUNT(DISTINCT "s"."id")');
        expect(sql).toContain('COUNT(DISTINCT "i"."operation_sighting_id")');
        expect(sql).toContain('MIN("s"."created_at")');
        expect(sql).toContain('MAX("s"."created_at")');
        expect(sql).toContain('GROUP BY "p"."user_id"');
        expect(parameters).toContain('user-1');
        expect(result).toMatchObject({
            userId: 'user-1',
            sightingCount: 12,
            invalidatedCount: 3,
            banned: false,
        });
    });

    it('要約の banned は「今 viewer」かつ「viewer にした記録がある」ときだけ true', async () => {
        rawRows = [{ userId: 'user-1', role: 'viewer', banned: true }];
        const result = await query.findUserSummary({ userId: 'user-1' });

        const { sql, parameters } = captured[0];
        expect(sql).toMatch(
            /"p"\."role" = \$\d+ AND EXISTS \(SELECT 1 FROM "user_role_changes" "rc" WHERE .*"rc"\."user_id" = "p"\."user_id".* AND "rc"\."to_role" = \$\d+\) AS "banned"/,
        );
        expect(parameters.filter((p) => p === 'viewer')).toHaveLength(1);
        expect(result?.banned).toBe(true);
    });

    it('投稿管理の対象は、profiles を FOR UPDATE で読んだ後に、同じ manager で別ステートメントとして直近の BAN の from_role を引く', async () => {
        rawQueue = [
            [{ userId: 'user-1', role: 'viewer' }],
            [{ fromRole: 'editor' }],
        ];
        const manager = dataSource.manager;
        const createQueryBuilder = vi.spyOn(manager, 'createQueryBuilder');
        const result = await query.findModerationTarget(
            { userId: 'user-1' },
            manager,
        );

        expect(createQueryBuilder).toHaveBeenCalledTimes(2);
        expect(captured).toHaveLength(2);

        const [lock, ban] = captured;
        expect(lock.sql).toContain('FROM "profiles" "p"');
        expect(lock.sql).toContain('FOR UPDATE');
        expect(lock.sql).not.toContain('user_role_changes');
        expect(lock.parameters).toEqual(['user-1']);

        expect(ban.sql).toMatch(
            /FROM "user_role_changes" "rc" WHERE "rc"\."user_id" = \$\d+ AND "rc"\."to_role" = \$\d+ ORDER BY "rc"\."created_at" DESC, "rc"\."id" DESC LIMIT 1$/,
        );
        expect(ban.sql).not.toContain('FOR UPDATE');
        expect(ban.parameters).toEqual(['user-1', 'viewer']);
        expect(result).toEqual({
            userId: 'user-1',
            role: 'viewer',
            lastBanFromRole: 'editor',
        });
    });

    it('BAN の記録が無ければ lastBanFromRole は null', async () => {
        rawQueue = [[{ userId: 'user-1', role: 'viewer' }], []];
        const result = await query.findModerationTarget(
            { userId: 'user-1' },
            dataSource.manager,
        );
        expect(result?.lastBanFromRole).toBeNull();
    });

    it('profiles が無ければ投稿管理の対象は null', async () => {
        expect(
            await query.findModerationTarget(
                { userId: 'nobody' },
                dataSource.manager,
            ),
        ).toBeNull();
        expect(captured).toHaveLength(1);
    });

    describe('手がかり（traces）', () => {
        const NOW = new Date('2026-11-03T00:00:00.000Z');
        const NINETY_DAYS_AGO = new Date('2026-08-05T00:00:00.000Z');

        it('IPv6 は /64 の網に、IPv4 は完全一致で束ねて、回数・UA・最後の日時を集める', async () => {
            await query.findTraces({ userId: 'user-1', now: NOW });

            const { sql } = captured[0];
            const bucket =
                'CASE WHEN family("t"."ip") = 6 THEN network(set_masklen("t"."ip", 64))::text ELSE host("t"."ip") END';
            expect(sql).toContain(`${bucket} AS "ip"`);
            expect(sql).toContain(`GROUP BY ${bucket}`);
            expect(sql).toContain('COUNT(*) AS "count"');
            expect(sql).toContain('MAX("t"."created_at") AS "lastSeenAt"');
            expect(sql).toContain('array_agg(DISTINCT "t"."user_agent")');
            expect(sql).toMatch(/ORDER BY "lastSeenAt" DESC/);
        });

        it('90 日より古い行は数えない（自分の行も、同じ手がかりの他人の行も）', async () => {
            rawQueue = [
                [
                    {
                        ip: '203.0.113.5',
                        userAgents: null,
                        count: '1',
                        lastSeenAt: NOW,
                    },
                ],
                [],
            ];
            await query.findTraces({ userId: 'user-1', now: NOW });

            expect(captured).toHaveLength(2);
            for (const { sql, parameters } of captured) {
                expect(sql).toContain('"t"."created_at" >= $');
                expect(parameters).toContainEqual(NINETY_DAYS_AGO);
            }
        });

        it('同じ手がかりの他のアカウントは自分を除き、1 手がかり 20 件まで', async () => {
            rawQueue = [
                [
                    {
                        ip: '2001:db8:1:2::/64',
                        userAgents: ['UA-1'],
                        count: '2',
                        lastSeenAt: NOW,
                    },
                ],
                [],
            ];
            await query.findTraces({ userId: 'user-1', now: NOW });

            const { sql, parameters } = captured[1];
            expect(sql).toContain('"x"."user_id" <> $');
            expect(sql).toMatch(/"x"\."rn" <= \$\d+/);
            expect(sql).toContain('"t"."ip" <<= ANY(');
            expect(sql).toMatch(
                /ROW_NUMBER\(\) OVER \(PARTITION BY .* ORDER BY \("t"\."user_id" = \$\d+\) ASC, MAX\("t"\."created_at"\) DESC/,
            );
            expect(sql).toMatch(/COUNT\(\*\) OVER \(PARTITION BY /);
            expect(parameters).toContain('user-1');
            expect(parameters).toContain(TRACE_OTHER_ACCOUNTS_LIMIT);
            expect(parameters).toContainEqual(['2001:db8:1:2::/64']);
        });

        it('他のアカウントの banned も「今 viewer かつ記録あり」の同じ規則で SQL が決める', async () => {
            rawQueue = [
                [
                    {
                        ip: '203.0.113.5',
                        userAgents: [],
                        count: '1',
                        lastSeenAt: NOW,
                    },
                ],
                [],
            ];
            await query.findTraces({ userId: 'user-1', now: NOW });

            expect(captured[1].sql).toMatch(
                /"p"\."role" = \$\d+ AND EXISTS \(SELECT 1 FROM "user_role_changes" "rc" WHERE .*"rc"\."user_id" = "p"\."user_id".* AND "rc"\."to_role" = \$\d+\) AS "banned"/,
            );
        });

        it('手がかりが無ければ 2 本目は流さない', async () => {
            const result = await query.findTraces({
                userId: 'user-1',
                now: NOW,
            });
            expect(result).toEqual([]);
            expect(captured).toHaveLength(1);
        });

        it('手がかりごとに他のアカウントを組み立て、他に居なければ accountCount は 1', async () => {
            rawQueue = [
                [
                    {
                        ip: '2001:db8:1:2::/64',
                        userAgents: ['UA-1', 'UA-2'],
                        count: '4',
                        lastSeenAt: NOW,
                    },
                    {
                        ip: '203.0.113.5',
                        userAgents: null,
                        count: '1',
                        lastSeenAt: new Date('2026-11-01T00:00:00.000Z'),
                    },
                ],
                [
                    {
                        ip: '2001:db8:1:2::/64',
                        userId: 'u-2',
                        username: 'bob',
                        role: 'viewer',
                        banned: true,
                        accountCount: '3',
                    },
                    {
                        ip: '2001:db8:1:2::/64',
                        userId: 'u-3',
                        username: 'carol',
                        role: 'reporter',
                        banned: false,
                        accountCount: '3',
                    },
                ],
            ];

            const result = await query.findTraces({
                userId: 'user-1',
                now: NOW,
            });

            expect(result).toEqual([
                {
                    ip: '2001:db8:1:2::/64',
                    userAgents: ['UA-1', 'UA-2'],
                    count: 4,
                    lastSeenAt: NOW,
                    accountCount: 3,
                    otherAccounts: [
                        {
                            userId: 'u-2',
                            username: 'bob',
                            role: 'viewer',
                            banned: true,
                        },
                        {
                            userId: 'u-3',
                            username: 'carol',
                            role: 'reporter',
                            banned: false,
                        },
                    ],
                },
                {
                    ip: '203.0.113.5',
                    userAgents: [],
                    count: 1,
                    lastSeenAt: new Date('2026-11-01T00:00:00.000Z'),
                    accountCount: 1,
                    otherAccounts: [],
                },
            ]);
        });
    });

    it('profiles が無ければ要約は null', async () => {
        expect(await query.findUserSummary({ userId: 'nobody' })).toBeNull();
    });
});
