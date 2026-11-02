import { UseCaseError } from '../../../core/classes/custom-error.js';
import { Role } from '../../../core/modules/rbac/role.enum.js';
import { ModerationTarget } from './moderation-target.domain.js';

const MANAGER_ID = 'm-1';
const TARGET_ID = 'u-1';

const create = (
    role: string,
    lastBanFromRole: string | null = null,
    userId = TARGET_ID,
) => ModerationTarget.create({ userId, role, lastBanFromRole });

const reasonOf = (fn: () => unknown): unknown => {
    try {
        fn();
    } catch (error) {
        expect(error).toBeInstanceOf(UseCaseError);
        return (error as UseCaseError).context.reason;
    }
    throw new Error('投げられなかった');
};

describe('ModerationTarget', () => {
    describe('ban', () => {
        it('reporter を BAN すると viewer にする記録を返す', () => {
            const change = create(Role.REPORTER).ban(
                { userId: MANAGER_ID },
                '荒らし',
            );
            expect(change).toEqual({
                userId: TARGET_ID,
                changedBy: MANAGER_ID,
                fromRole: 'reporter',
                toRole: 'viewer',
                reason: '荒らし',
            });
        });

        it('editor も BAN できる（戻す先は editor）', () => {
            const change = create(Role.EDITOR).ban(
                { userId: MANAGER_ID },
                '乗っ取り',
            );
            expect(change.fromRole).toBe('editor');
            expect(change.toRole).toBe('viewer');
        });

        it('自分は BAN できない', () => {
            expect(
                reasonOf(() =>
                    create(Role.REPORTER, null, MANAGER_ID).ban(
                        { userId: MANAGER_ID },
                        '理由',
                    ),
                ),
            ).toBe('self');
        });

        it('自分が MANAGER でも自分の理由は self が先', () => {
            expect(
                reasonOf(() =>
                    create(Role.MANAGER, null, MANAGER_ID).ban(
                        { userId: MANAGER_ID },
                        '理由',
                    ),
                ),
            ).toBe('self');
        });

        it('別の MANAGER は BAN できない', () => {
            expect(
                reasonOf(() =>
                    create(Role.MANAGER).ban({ userId: MANAGER_ID }, '理由'),
                ),
            ).toBe('manager');
        });

        it('すでに viewer の人は BAN できない', () => {
            expect(
                reasonOf(() =>
                    create(Role.VIEWER).ban({ userId: MANAGER_ID }, '理由'),
                ),
            ).toBe('already_banned');
        });

        it.each(['', '   ', 'あ'.repeat(201)])(
            '理由が %j（空・空白・201 字）なら reason_required',
            (reason) => {
                expect(
                    reasonOf(() =>
                        create(Role.REPORTER).ban(
                            { userId: MANAGER_ID },
                            reason,
                        ),
                    ),
                ).toBe('reason_required');
            },
        );

        it('理由は 200 字ちょうどまで通る', () => {
            const reason = 'あ'.repeat(200);
            expect(
                create(Role.REPORTER).ban({ userId: MANAGER_ID }, reason)
                    .reason,
            ).toBe(reason);
        });
    });

    describe('unban', () => {
        it('直近の BAN の from_role に戻す', () => {
            const change = create(Role.VIEWER, 'editor').unban(
                { userId: MANAGER_ID },
                '誤爆',
            );
            expect(change).toEqual({
                userId: TARGET_ID,
                changedBy: MANAGER_ID,
                fromRole: 'viewer',
                toRole: 'editor',
                reason: '誤爆',
            });
        });

        it('BAN の記録が無い viewer は reporter に戻す', () => {
            const change = create(Role.VIEWER, null).unban(
                { userId: MANAGER_ID },
                null,
            );
            expect(change.toRole).toBe('reporter');
            expect(change.reason).toBeNull();
        });

        it('viewer でない人の解除は not_banned', () => {
            expect(
                reasonOf(() =>
                    create(Role.REPORTER, 'editor').unban(
                        { userId: MANAGER_ID },
                        null,
                    ),
                ),
            ).toBe('not_banned');
        });

        it('理由を付けるなら 201 字は reason_required', () => {
            expect(
                reasonOf(() =>
                    create(Role.VIEWER, null).unban(
                        { userId: MANAGER_ID },
                        'あ'.repeat(201),
                    ),
                ),
            ).toBe('reason_required');
        });
    });
});
