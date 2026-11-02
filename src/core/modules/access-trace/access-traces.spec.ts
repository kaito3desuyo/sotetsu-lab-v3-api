import { AccessTraces } from './access-traces.js';

describe('AccessTraces', () => {
    const execute = vi.fn();
    const qb = {
        insert: vi.fn().mockReturnThis(),
        into: vi.fn().mockReturnThis(),
        values: vi.fn().mockReturnThis(),
        orIgnore: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        execute,
    };
    const repository = { createQueryBuilder: vi.fn(() => qb) };
    let traces: AccessTraces;

    beforeEach(() => {
        vi.clearAllMocks();
        for (const fn of [
            qb.insert,
            qb.into,
            qb.values,
            qb.orIgnore,
            qb.delete,
            qb.from,
            qb.where,
        ]) {
            fn.mockReturnThis();
        }
        repository.createQueryBuilder.mockReturnValue(qb);
        execute.mockResolvedValue({});
        traces = new AccessTraces(repository as never);
    });

    const session = (ip: string) => ({
        userId: 'u1',
        sessionId: 's1',
        ip,
        userAgent: 'UA',
    });

    it('同じ sessionId と ip の 2 回目は DB に書かない', async () => {
        await traces.recordSession(session('198.51.100.10'));
        await traces.recordSession(session('198.51.100.10'));
        expect(qb.insert).toHaveBeenCalledTimes(1);
        expect(qb.orIgnore).toHaveBeenCalledTimes(1);
        expect(qb.values).toHaveBeenCalledWith(
            expect.objectContaining({
                userId: 'u1',
                kind: 'session',
                sessionId: 's1',
                ip: '198.51.100.10',
                userAgent: 'UA',
            }),
        );
    });

    it('ip が違えば同じセッションでも書く', async () => {
        await traces.recordSession(session('198.51.100.10'));
        await traces.recordSession(session('198.51.100.11'));
        expect(qb.insert).toHaveBeenCalledTimes(2);
    });

    it('recordPost は渡された manager で post の行を書き、purge しない', async () => {
        const managerQb = { ...qb };
        const manager = { createQueryBuilder: vi.fn(() => managerQb) };
        await traces.recordPost(
            {
                userId: 'u1',
                operationSightingId: 'o1',
                ip: '198.51.100.10',
                userAgent: null,
            },
            manager as never,
        );
        expect(manager.createQueryBuilder).toHaveBeenCalledTimes(1);
        // 投稿のトランザクションの中から別接続で DELETE を待たない
        expect(repository.createQueryBuilder).not.toHaveBeenCalled();
        expect(managerQb.delete).not.toHaveBeenCalled();
        expect(managerQb.values).toHaveBeenCalledWith(
            expect.objectContaining({
                userId: 'u1',
                kind: 'post',
                operationSightingId: 'o1',
                ip: '198.51.100.10',
                userAgent: null,
            }),
        );
    });

    it('purgeExpiredIfDue は 1 時間に 1 回、90 日より古い行を消す', async () => {
        const base = new Date('2026-11-03T00:00:00Z');
        const at = (min: number) => new Date(base.getTime() + min * 60_000);
        await traces.purgeExpiredIfDue(at(0));
        await traces.purgeExpiredIfDue(at(30));
        await traces.purgeExpiredIfDue(at(61));
        expect(qb.delete).toHaveBeenCalledTimes(2);
        const cutoff = (min: number) =>
            new Date(at(min).getTime() - 90 * 24 * 60 * 60 * 1000);
        expect(qb.where).toHaveBeenNthCalledWith(1, 'created_at < :cutoff', {
            cutoff: cutoff(0),
        });
        expect(qb.where).toHaveBeenNthCalledWith(2, 'created_at < :cutoff', {
            cutoff: cutoff(61),
        });
    });

    it('purge の失敗は握る', async () => {
        execute.mockRejectedValueOnce(new Error('db down'));
        await expect(traces.purgeExpiredIfDue()).resolves.toBeUndefined();
    });
});
