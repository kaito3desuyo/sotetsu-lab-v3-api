import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, SelectQueryBuilder } from 'typeorm';
import { ENTITIES } from '../../../../core/configs/entities.js';
import { TypeOrmNamingStrategy } from '../../../../core/configs/typeorm-naming-strategy.js';
import { ProfileModel } from '../models/profile.model.js';
import { UserQuery } from './user.query.js';

/**
 * DB には繋がずに、TypeORM が組み立てる SQL とパラメータを見る。
 * 実行（getRawMany / getRawOne）だけを差し替えて、その時点の SQL を取る。
 */
describe('UserQuery（生成される SQL）', () => {
    let dataSource: DataSource;
    let query: UserQuery;
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
                UserQuery,
                {
                    provide: getRepositoryToken(ProfileModel),
                    useValue: dataSource.getRepository(ProfileModel),
                },
            ],
        }).compile();
        query = module.get(UserQuery);
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

    it('BAN・解除の対象は、profiles を FOR UPDATE で読んだ後に、同じ manager で別ステートメントとして直近の BAN の from_role を引く', async () => {
        rawQueue = [
            [{ userId: 'user-1', role: 'viewer' }],
            [{ fromRole: 'editor' }],
        ];
        const manager = dataSource.manager;
        const createQueryBuilder = vi.spyOn(manager, 'createQueryBuilder');
        const result = await query.findBanTarget({ userId: 'user-1' }, manager);

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
        const result = await query.findBanTarget(
            { userId: 'user-1' },
            dataSource.manager,
        );
        expect(result?.lastBanFromRole).toBeNull();
    });

    it('profiles が無ければBAN・解除の対象は null', async () => {
        expect(
            await query.findBanTarget({ userId: 'nobody' }, dataSource.manager),
        ).toBeNull();
        expect(captured).toHaveLength(1);
    });

    it('profiles が無ければ要約は null', async () => {
        expect(await query.findUserSummary({ userId: 'nobody' })).toBeNull();
    });
});
