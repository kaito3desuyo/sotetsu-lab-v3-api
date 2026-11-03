import { UserAccessTraceCommand } from '../infrastructure/command/user-access-trace.command.js';
import { UserAccessTraceService } from './user-access-trace.service.js';

describe('UserAccessTraceService', () => {
    const command = {
        insertSession: vi.fn(),
        insertPost: vi.fn(),
        deleteOlderThan: vi.fn(),
    };
    let traces: UserAccessTraceService;

    beforeEach(() => {
        vi.clearAllMocks();
        command.insertSession.mockResolvedValue(undefined);
        command.insertPost.mockResolvedValue(undefined);
        command.deleteOlderThan.mockResolvedValue(undefined);
        traces = new UserAccessTraceService(
            command as unknown as UserAccessTraceCommand,
        );
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
        expect(command.insertSession).toHaveBeenCalledTimes(1);
        expect(command.insertSession).toHaveBeenCalledWith(
            session('198.51.100.10'),
        );
    });

    it('ip が違えば同じセッションでも書く', async () => {
        await traces.recordSession(session('198.51.100.10'));
        await traces.recordSession(session('198.51.100.11'));
        expect(command.insertSession).toHaveBeenCalledTimes(2);
    });

    it('recordPost は渡された manager で post の行を書き、purge しない', async () => {
        const manager = {};
        const params = {
            userId: 'u1',
            operationSightingId: 'o1',
            ip: '198.51.100.10',
            userAgent: null,
        };
        await traces.recordPost(params, manager as never);
        expect(command.insertPost).toHaveBeenCalledWith(params, manager);
        // 投稿のトランザクションの中から別接続で DELETE を待たない
        expect(command.deleteOlderThan).not.toHaveBeenCalled();
    });

    it('purgeExpiredIfDue は 1 時間に 1 回、90 日より古い行を消す', async () => {
        const base = new Date('2026-11-03T00:00:00Z');
        const at = (min: number) => new Date(base.getTime() + min * 60_000);
        await traces.purgeExpiredIfDue(at(0));
        await traces.purgeExpiredIfDue(at(30));
        await traces.purgeExpiredIfDue(at(61));
        expect(command.deleteOlderThan).toHaveBeenCalledTimes(2);
        const cutoff = (min: number) =>
            new Date(at(min).getTime() - 90 * 24 * 60 * 60 * 1000);
        expect(command.deleteOlderThan).toHaveBeenNthCalledWith(1, cutoff(0));
        expect(command.deleteOlderThan).toHaveBeenNthCalledWith(2, cutoff(61));
    });

    it('purge の失敗は握る', async () => {
        command.deleteOlderThan.mockRejectedValueOnce(new Error('db down'));
        await expect(traces.purgeExpiredIfDue()).resolves.toBeUndefined();
    });
});
