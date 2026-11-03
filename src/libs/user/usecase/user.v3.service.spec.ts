import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { UseCaseError } from '../../../core/classes/custom-error.js';
import { UserAccessTraceQuery } from '../infrastructure/queries/user-access-trace.query.js';
import { UserQuery } from '../infrastructure/queries/user.query.js';
import { UserRoleChangeService } from './user-role-change.service.js';
import { UserV3Service } from './user.v3.service.js';

describe('UserV3Service', () => {
    let service: UserV3Service;
    const query = {
        findUserSummary: vi.fn(),
        findBanTarget: vi.fn(),
    };
    const traceQuery = { findTraces: vi.fn() };
    const roleChangeCommand = { apply: vi.fn() };
    const manager = { name: 'manager' };
    const dataSource = {
        transaction: vi.fn(async (callback: (m: unknown) => unknown) =>
            callback(manager),
        ),
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        dataSource.transaction.mockImplementation(async (callback) =>
            callback(manager),
        );
        const module = await Test.createTestingModule({
            providers: [
                UserV3Service,
                { provide: UserQuery, useValue: query },
                { provide: UserAccessTraceQuery, useValue: traceQuery },
                { provide: UserRoleChangeService, useValue: roleChangeCommand },
                { provide: DataSource, useValue: dataSource },
            ],
        }).compile();
        service = module.get(UserV3Service);
    });

    it('profiles の無い userId の要約は 404（UseCaseError は filter が 422 にするので NotFoundException）', async () => {
        query.findUserSummary.mockResolvedValue(null);
        await expect(
            service.findUserSummary({ userId: 'nobody' }),
        ).rejects.toBeInstanceOf(NotFoundException);
    });

    it.each([
        ['BAN の記録がある viewer', true],
        ['記録の無い viewer や、viewer でない人', false],
    ])(
        '%s の banned は query が決めた %s のまま返す',
        async (_label, banned) => {
            query.findUserSummary.mockResolvedValue({
                userId: 'u-1',
                username: 'alice',
                displayName: 'Alice',
                role: 'viewer',
                createdAt: new Date('2026-10-30T00:00:00.000Z'),
                sightingCount: 0,
                invalidatedCount: 0,
                firstSightingAt: null,
                lastSightingAt: null,
                banned,
            });
            const result = await service.findUserSummary({ userId: 'u-1' });
            expect(result.banned).toBe(banned);
            expect(result.firstSightingAt).toBeNull();
            expect(result.createdAt).toBe('2026-10-30T00:00:00.000Z');
        },
    );

    describe('BAN・解除', () => {
        const summaryRow = {
            userId: 'u-1',
            username: 'alice',
            displayName: 'Alice',
            role: 'viewer',
            createdAt: new Date('2026-10-30T00:00:00.000Z'),
            sightingCount: 0,
            invalidatedCount: 0,
            firstSightingAt: null,
            lastSightingAt: null,
            banned: true,
        };

        it('BAN は 1 トランザクションで対象を読み・書き、直した後の要約を返す', async () => {
            query.findBanTarget.mockResolvedValue({
                userId: 'u-1',
                role: 'reporter',
                lastBanFromRole: null,
            });
            query.findUserSummary.mockResolvedValue(summaryRow);

            const result = await service.banUser({
                userId: 'u-1',
                changedBy: 'm-1',
                reason: '荒らし',
            });

            expect(dataSource.transaction).toHaveBeenCalledTimes(1);
            expect(query.findBanTarget).toHaveBeenCalledWith(
                { userId: 'u-1' },
                manager,
            );
            expect(roleChangeCommand.apply).toHaveBeenCalledWith(
                {
                    userId: 'u-1',
                    changedBy: 'm-1',
                    fromRole: 'reporter',
                    toRole: 'viewer',
                    reason: '荒らし',
                },
                manager,
            );
            expect(result.banned).toBe(true);
            expect(query.findUserSummary).toHaveBeenCalledWith({
                userId: 'u-1',
            });
            expect(
                query.findUserSummary.mock.invocationCallOrder[0],
            ).toBeGreaterThan(
                roleChangeCommand.apply.mock.invocationCallOrder[0],
            );
        });

        it('profiles の無い対象の BAN は 404 で、何も書かない', async () => {
            query.findBanTarget.mockResolvedValue(null);
            await expect(
                service.banUser({
                    userId: 'nobody',
                    changedBy: 'm-1',
                    reason: 'r',
                }),
            ).rejects.toBeInstanceOf(NotFoundException);
            expect(roleChangeCommand.apply).not.toHaveBeenCalled();
        });

        it.each([
            ['自分', { userId: 'm-1', role: 'manager' }, 'self'],
            ['別の MANAGER', { userId: 'u-1', role: 'manager' }, 'manager'],
            [
                'すでに viewer',
                { userId: 'u-1', role: 'viewer' },
                'already_banned',
            ],
        ])(
            '%s の BAN は UseCaseError で、何も書かない',
            async (_l, target, reason) => {
                query.findBanTarget.mockResolvedValue({
                    ...target,
                    lastBanFromRole: null,
                });
                const promise = service.banUser({
                    userId: target.userId,
                    changedBy: 'm-1',
                    reason: 'r',
                });
                await expect(promise).rejects.toBeInstanceOf(UseCaseError);
                await expect(promise).rejects.toMatchObject({
                    context: { reason },
                });
                expect(roleChangeCommand.apply).not.toHaveBeenCalled();
            },
        );

        it('解除は直近の BAN の from_role に戻す', async () => {
            query.findBanTarget.mockResolvedValue({
                userId: 'u-1',
                role: 'viewer',
                lastBanFromRole: 'editor',
            });
            query.findUserSummary.mockResolvedValue({
                ...summaryRow,
                role: 'editor',
                banned: false,
            });

            const result = await service.unbanUser({
                userId: 'u-1',
                changedBy: 'm-1',
                reason: '誤爆',
            });

            expect(roleChangeCommand.apply).toHaveBeenCalledWith(
                {
                    userId: 'u-1',
                    changedBy: 'm-1',
                    fromRole: 'viewer',
                    toRole: 'editor',
                    reason: '誤爆',
                },
                manager,
            );
            expect(result.banned).toBe(false);
        });

        it('理由なしの解除は reason: null で記録する', async () => {
            query.findBanTarget.mockResolvedValue({
                userId: 'u-1',
                role: 'viewer',
                lastBanFromRole: null,
            });
            query.findUserSummary.mockResolvedValue(summaryRow);
            await service.unbanUser({ userId: 'u-1', changedBy: 'm-1' });
            expect(roleChangeCommand.apply).toHaveBeenCalledWith(
                expect.objectContaining({ toRole: 'reporter', reason: null }),
                manager,
            );
        });

        it('viewer でない人の解除は UseCaseError', async () => {
            query.findBanTarget.mockResolvedValue({
                userId: 'u-1',
                role: 'reporter',
                lastBanFromRole: null,
            });
            await expect(
                service.unbanUser({ userId: 'u-1', changedBy: 'm-1' }),
            ).rejects.toMatchObject({ context: { reason: 'not_banned' } });
            expect(roleChangeCommand.apply).not.toHaveBeenCalled();
        });
    });

    describe('手がかり', () => {
        it('日時を ISO にし、アカウントが 10 以上の手がかりを shared にする', async () => {
            const other = {
                userId: 'u-2',
                username: 'bob',
                role: 'viewer',
                banned: true,
            };
            traceQuery.findTraces.mockResolvedValue([
                {
                    ip: '203.0.113.5',
                    userAgents: ['UA-1'],
                    count: 3,
                    lastSeenAt: new Date('2026-11-02T01:00:00.000Z'),
                    accountCount: 9,
                    otherAccounts: [other],
                },
                {
                    ip: '2001:db8:1:2::/64',
                    userAgents: [],
                    count: 1,
                    lastSeenAt: new Date('2026-11-01T01:00:00.000Z'),
                    accountCount: 10,
                    otherAccounts: [],
                },
            ]);

            const result = await service.findTraces({ userId: 'u-1' });

            expect(traceQuery.findTraces).toHaveBeenCalledWith({
                userId: 'u-1',
            });
            expect(result[0]).toEqual({
                ip: '203.0.113.5',
                userAgents: ['UA-1'],
                count: 3,
                lastSeenAt: '2026-11-02T01:00:00.000Z',
                accountCount: 9,
                shared: false,
                otherAccounts: [other],
            });
            expect(result[1].shared).toBe(true);
        });
    });
});
