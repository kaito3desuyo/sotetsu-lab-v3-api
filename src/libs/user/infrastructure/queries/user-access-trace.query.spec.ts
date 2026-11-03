import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, SelectQueryBuilder } from 'typeorm';
import { ENTITIES } from '../../../../core/configs/entities.js';
import { TypeOrmNamingStrategy } from '../../../../core/configs/typeorm-naming-strategy.js';
import { TRACE_OTHER_ACCOUNTS_LIMIT } from '../../user.constants.js';
import { UserAccessTraceModel } from '../models/user-access-trace.model.js';
import { UserAccessTraceQuery } from './user-access-trace.query.js';

/**
 * DB には繋がずに、TypeORM が組み立てる SQL とパラメータを見る。
 * 実行（getRawMany / getRawOne）だけを差し替えて、その時点の SQL を取る。
 */
describe('UserAccessTraceQuery（生成される SQL）', () => {
    let dataSource: DataSource;
    let query: UserAccessTraceQuery;
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
                UserAccessTraceQuery,
                {
                    provide: getRepositoryToken(UserAccessTraceModel),
                    useValue: dataSource.getRepository(UserAccessTraceModel),
                },
            ],
        }).compile();
        query = module.get(UserAccessTraceQuery);
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
});
