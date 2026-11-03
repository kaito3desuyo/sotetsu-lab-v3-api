import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, SelectQueryBuilder } from 'typeorm';
import { ENTITIES } from '../../../../core/configs/entities.js';
import { TypeOrmNamingStrategy } from '../../../../core/configs/typeorm-naming-strategy.js';
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
        await query.findManyRecent({
            limit: 100,
            before: null,
            burstWindowMinutes: 60,
        });

        const { sql } = captured[0];
        expect(sql).toMatch(
            /LEFT JOIN "operation_sighting_authors" "a" ON "a"\."operation_sighting_id" = "s"\."id"/,
        );
        expect(sql).toMatch(/LEFT JOIN "profiles" "ap"/);
        expect(sql).toMatch(/ORDER BY "s"\."created_at" DESC, "s"\."id" DESC/);
    });

    it('新着は窓（呼び出し側が渡す分）の中の同じ人の投稿数を事実として数える（件数の閾値は持たない）', async () => {
        await query.findManyRecent({
            limit: 100,
            before: null,
            burstWindowMinutes: 45,
        });

        const { sql, parameters } = captured[0];
        expect(sql).toContain('FROM "operation_sighting_authors" "a2"');
        expect(sql).toContain('"a2"."user_id" = "a"."user_id"');
        expect(sql).toContain('"s2"."created_at" <= "s"."created_at"');
        expect(sql).toMatch(/interval '1 minute' \* \$\d+/);
        expect(sql).toMatch(/\(SELECT COUNT\(\*\).*\) AS "recentPostCount"/);
        expect(parameters).toContain(45);
        expect(sql).not.toMatch(/>= \$\d+/);
    });

    it('新着は投稿者の登録日時を事実として返す（24 時間の判定は持たない）', async () => {
        await query.findManyRecent({
            limit: 100,
            before: null,
            burstWindowMinutes: 60,
        });

        const { sql } = captured[0];
        expect(sql).toContain('"ap"."created_at" AS "authorRegisteredAt"');
        expect(sql).not.toContain("interval '1 hour'");
    });

    it('SQL に印の判定（CASE）も役割の絞りも入れない', async () => {
        await query.findManyRecent({
            limit: 100,
            before: null,
            burstWindowMinutes: 60,
        });

        const { sql, parameters } = captured[0];
        expect(sql).not.toContain('CASE WHEN');
        expect(sql).not.toContain('"newAccount"');
        expect(sql).not.toContain('"burst"');
        expect(parameters).not.toContain('reporter');
        expect(parameters).not.toContain('viewer');
    });

    it.each(['reporter', 'editor', 'manager'])(
        '%s の投稿者も、役割・登録日時・窓の投稿数をそのまま返す（絞らない）',
        async (role) => {
            const registeredAt = new Date('2026-11-01T01:00:00.000Z');
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
                    authorRegisteredAt: registeredAt,
                    recentPostCount: '7',
                },
            ];
            const [row] = await query.findManyRecent({
                limit: 100,
                before: null,
                burstWindowMinutes: 60,
            });
            expect(row.author).toEqual({
                userId: 'u-1',
                username: 'alice',
                displayName: 'Alice',
                role,
                registeredAt,
                recentPostCount: 7,
            });
        },
    );

    it('ゲストの目撃（投稿者の行が無い）は author が null', async () => {
        rawRows = [
            {
                operationSightingId: 's-1',
                sightingTime: new Date('2026-11-02T01:00:00.000Z'),
                createdAt: new Date('2026-11-02T01:05:00.000Z'),
                operationNumber: '41',
                formationNumber: '8701',
                invalidated: false,
                authorUserId: null,
                recentPostCount: '0',
            },
        ];
        const [row] = await query.findManyRecent({
            limit: 100,
            before: null,
            burstWindowMinutes: 60,
        });
        expect(row.author).toBeNull();
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
