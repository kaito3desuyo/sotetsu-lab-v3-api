import { UserAccessTraceRow } from '../../infrastructure/queries/user-access-trace.query.js';
import { UserAccessTraceReadModel } from './user-access-trace.read-model.js';

describe('UserAccessTraceReadModel', () => {
    describe('isShared', () => {
        it.each([
            [1, false],
            [9, false],
            [10, true],
            [11, true],
        ])('アカウント %i 件は shared=%s（境目は 10）', (count, expected) => {
            expect(UserAccessTraceReadModel.isShared(count)).toBe(expected);
        });
    });

    describe('toDto', () => {
        const other = {
            userId: 'u-2',
            username: 'bob',
            role: 'viewer',
            banned: true,
        };
        const row = (accountCount: number): UserAccessTraceRow => ({
            ip: '203.0.113.5',
            userAgents: ['UA-1'],
            count: 3,
            lastSeenAt: new Date('2026-11-02T01:00:00.000Z'),
            accountCount,
            otherAccounts: [other],
        });

        it('日時を ISO にし、行の中身をそのまま DTO にする', () => {
            expect(UserAccessTraceReadModel.toDto(row(9))).toEqual({
                ip: '203.0.113.5',
                userAgents: ['UA-1'],
                count: 3,
                lastSeenAt: '2026-11-02T01:00:00.000Z',
                accountCount: 9,
                shared: false,
                otherAccounts: [other],
            });
        });

        it('アカウントが 10 件なら shared にする', () => {
            expect(UserAccessTraceReadModel.toDto(row(10)).shared).toBe(true);
        });
    });
});
