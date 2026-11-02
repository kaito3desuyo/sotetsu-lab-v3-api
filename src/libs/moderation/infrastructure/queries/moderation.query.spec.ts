import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, SelectQueryBuilder } from 'typeorm';
import { ENTITIES } from '../../../../core/configs/entities.js';
import { TypeOrmNamingStrategy } from '../../../../core/configs/typeorm-naming-strategy.js';
import { OperationSightingAuthorModel } from '../../../operation-sighting/infrastructure/models/operation-sighting-author.model.js';
import { OperationSightingModel } from '../../../operation-sighting/infrastructure/models/operation-sighting.model.js';
import { ProfileModel } from '../../../user/infrastructure/models/profile.model.js';
import {
    BURST_COUNT,
    BURST_WINDOW_MINUTES,
    NEW_ACCOUNT_HOURS,
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
            ],
        }).compile();
        query = module.get(ModerationQuery);
    });

    beforeEach(() => {
        captured = [];
        rawRows = [];
        const capture = function (this: SelectQueryBuilder<any>) {
            const [sql, parameters] = this.getQueryAndParameters();
            captured.push({ sql, parameters });
            return Promise.resolve(rawRows);
        };
        vi.spyOn(SelectQueryBuilder.prototype, 'getRawMany').mockImplementation(
            capture as any,
        );
        vi.spyOn(SelectQueryBuilder.prototype, 'getRawOne').mockImplementation(
            async function (this: SelectQueryBuilder<any>) {
                await capture.call(this);
                return rawRows[0];
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
        expect(parameters).toEqual(['user-1']);
        expect(result).toMatchObject({
            userId: 'user-1',
            sightingCount: 12,
            invalidatedCount: 3,
        });
    });

    it('profiles が無ければ要約は null', async () => {
        expect(await query.findUserSummary({ userId: 'nobody' })).toBeNull();
    });
});
