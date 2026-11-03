import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, SelectQueryBuilder } from 'typeorm';
import { ENTITIES } from '../../../../core/configs/entities.js';
import { TypeOrmNamingStrategy } from '../../../../core/configs/typeorm-naming-strategy.js';
import {
    BURST_COUNT,
    BURST_WINDOW_MINUTES,
    NEW_ACCOUNT_HOURS,
} from '../../operation-sighting.constants.js';
import { OperationSightingAuthorModel } from '../models/operation-sighting-author.model.js';
import { OperationSightingModel } from '../models/operation-sighting.model.js';
import { OperationSightingAuthorQuery } from './operation-sighting-author.query.js';

/**
 * DB には繋がずに、TypeORM が組み立てる SQL とパラメータを見る。
 * 実行（getRawMany / getRawOne）だけを差し替えて、その時点の SQL を取る。
 */
describe('OperationSightingAuthorQuery（生成される SQL）', () => {
    let dataSource: DataSource;
    let query: OperationSightingAuthorQuery;
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
                OperationSightingAuthorQuery,
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
            ],
        }).compile();
        query = module.get(OperationSightingAuthorQuery);
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
        await query.findManyByUserId({
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
        await query.findManyByUserId({
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
        await query.findManyByUserId({
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
        await query.findManyRecent({ limit: 100, before: null });

        const { sql } = captured[0];
        expect(sql).toMatch(
            /LEFT JOIN "operation_sighting_authors" "a" ON "a"\."operation_sighting_id" = "s"\."id"/,
        );
        expect(sql).toMatch(/LEFT JOIN "profiles" "ap"/);
        expect(sql).toMatch(/ORDER BY "s"\."created_at" DESC, "s"\."id" DESC/);
    });

    it('新着の burst は、その目撃までの 60 分に同じ人の投稿が 5 件以上', async () => {
        await query.findManyRecent({ limit: 100, before: null });

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
        await query.findManyRecent({ limit: 100, before: null });

        const { sql, parameters } = captured[0];
        expect(sql).toMatch(
            /"s"\."created_at" < "ap"\."created_at" \+ interval '1 hour' \* \$\d+/,
        );
        expect(parameters).toContain(NEW_ACCOUNT_HOURS);
    });

    it('印は reporter・viewer の投稿者だけ計算する（SQL の CASE）', async () => {
        await query.findManyRecent({ limit: 100, before: null });

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
            const [row] = await query.findManyRecent({
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
        const [row] = await query.findManyRecent({
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
});
