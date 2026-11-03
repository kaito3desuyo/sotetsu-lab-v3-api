import { UserAccessTraceCommand } from './user-access-trace.command.js';

describe('UserAccessTraceCommand', () => {
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
    let command: UserAccessTraceCommand;

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
        command = new UserAccessTraceCommand(repository as never);
    });

    it('insertSession は session の行を orIgnore で書く', async () => {
        await command.insertSession({
            userId: 'u1',
            sessionId: 's1',
            ip: '198.51.100.10',
            userAgent: 'UA',
        });
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

    it('insertPost は渡された manager で post の行を書く', async () => {
        const managerQb = { ...qb };
        const manager = { createQueryBuilder: vi.fn(() => managerQb) };
        await command.insertPost(
            {
                userId: 'u1',
                operationSightingId: 'o1',
                ip: '198.51.100.10',
                userAgent: null,
            },
            manager as never,
        );
        expect(manager.createQueryBuilder).toHaveBeenCalledTimes(1);
        expect(repository.createQueryBuilder).not.toHaveBeenCalled();
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

    it('deleteOlderThan は cutoff より古い行を消す', async () => {
        const cutoff = new Date('2026-08-05T00:00:00Z');
        await command.deleteOlderThan(cutoff);
        expect(qb.delete).toHaveBeenCalledTimes(1);
        expect(qb.where).toHaveBeenCalledWith('created_at < :cutoff', {
            cutoff,
        });
    });
});
