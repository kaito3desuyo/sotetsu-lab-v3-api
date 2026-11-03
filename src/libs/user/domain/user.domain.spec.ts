import { UseCaseError } from '../../../core/classes/custom-error.js';
import { UniqueEntityId } from '../../../core/classes/unique-entity-id.js';
import { Role } from '../../../core/modules/rbac/role.enum.js';
import { UserRoleChanges } from './user-role-change.domain.js';
import { UserRoleValue } from './user-role-value.domain.js';
import { User } from './user.domain.js';

const MANAGER_ID = 'm-1';
const TARGET_ID = 'u-1';

const create = (
    role: string,
    lastBanFromRole: string | null = null,
    userId = TARGET_ID,
) =>
    User.create(
        {
            role: UserRoleValue.create(role),
            lastBanFromRole:
                lastBanFromRole === null
                    ? null
                    : UserRoleValue.create(lastBanFromRole),
            roleChanges: UserRoleChanges.create(),
        },
        new UniqueEntityId(userId),
    );

/** この操作で足した役割の変更を、保存される形（文字列）にして取り出す */
const newChanges = (user: User) =>
    user.props.roleChanges.getNewItems().map((change) => ({
        userId: change.props.userId,
        changedBy: change.props.changedBy,
        fromRole: change.props.fromRole.value,
        toRole: change.props.toRole.value,
        reason: change.props.reason?.value ?? null,
    }));

const reasonOf = (fn: () => unknown): unknown => {
    try {
        fn();
    } catch (error) {
        expect(error).toBeInstanceOf(UseCaseError);
        return (error as UseCaseError).context.reason;
    }
    throw new Error('投げられなかった');
};

describe('User', () => {
    describe('ban', () => {
        it('reporter を BAN すると viewer にし、役割の変更を 1 件足す', () => {
            const user = create(Role.REPORTER);
            user.ban({ userId: MANAGER_ID }, '荒らし');

            expect(user.props.role.value).toBe('viewer');
            expect(newChanges(user)).toEqual([
                {
                    userId: TARGET_ID,
                    changedBy: MANAGER_ID,
                    fromRole: 'reporter',
                    toRole: 'viewer',
                    reason: '荒らし',
                },
            ]);
        });

        it('editor も BAN できる（戻す先は editor）', () => {
            const user = create(Role.EDITOR);
            user.ban({ userId: MANAGER_ID }, '乗っ取り');

            const [change] = newChanges(user);
            expect(change.fromRole).toBe('editor');
            expect(change.toRole).toBe('viewer');
        });

        it('自分は BAN できない（役割は変わらず、変更も足さない）', () => {
            const user = create(Role.REPORTER, null, MANAGER_ID);
            expect(
                reasonOf(() => user.ban({ userId: MANAGER_ID }, '理由')),
            ).toBe('self');
            expect(user.props.role.value).toBe('reporter');
            expect(newChanges(user)).toEqual([]);
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
                const user = create(Role.REPORTER);
                expect(
                    reasonOf(() => user.ban({ userId: MANAGER_ID }, reason)),
                ).toBe('reason_required');
                expect(user.props.role.value).toBe('reporter');
                expect(newChanges(user)).toEqual([]);
            },
        );

        it('規則違反は理由の検査より先（MANAGER は理由が空でも manager）', () => {
            expect(
                reasonOf(() =>
                    create(Role.MANAGER).ban({ userId: MANAGER_ID }, ''),
                ),
            ).toBe('manager');
        });

        it('理由のエラーに対象の userId を添える', () => {
            try {
                create(Role.REPORTER).ban({ userId: MANAGER_ID }, ' ');
                throw new Error('投げられなかった');
            } catch (error) {
                expect((error as UseCaseError).context).toEqual({
                    reason: 'reason_required',
                    userId: TARGET_ID,
                });
            }
        });

        it('理由は 200 字ちょうどまで通る', () => {
            const reason = 'あ'.repeat(200);
            const user = create(Role.REPORTER);
            user.ban({ userId: MANAGER_ID }, reason);
            expect(newChanges(user)[0].reason).toBe(reason);
        });
    });

    describe('unban', () => {
        it('直近の BAN の from_role に戻す', () => {
            const user = create(Role.VIEWER, 'editor');
            user.unban({ userId: MANAGER_ID }, '誤爆');

            expect(user.props.role.value).toBe('editor');
            expect(newChanges(user)).toEqual([
                {
                    userId: TARGET_ID,
                    changedBy: MANAGER_ID,
                    fromRole: 'viewer',
                    toRole: 'editor',
                    reason: '誤爆',
                },
            ]);
        });

        it('BAN の記録が無い viewer は reporter に戻す（理由なしは null で記録）', () => {
            const user = create(Role.VIEWER, null);
            user.unban({ userId: MANAGER_ID }, null);

            const [change] = newChanges(user);
            expect(change.toRole).toBe('reporter');
            expect(change.reason).toBeNull();
        });

        it('viewer でない人の解除は not_banned', () => {
            const user = create(Role.REPORTER, 'editor');
            expect(
                reasonOf(() => user.unban({ userId: MANAGER_ID }, null)),
            ).toBe('not_banned');
            expect(newChanges(user)).toEqual([]);
        });

        it('理由を付けるなら 201 字は reason_required', () => {
            const user = create(Role.VIEWER, null);
            expect(
                reasonOf(() =>
                    user.unban({ userId: MANAGER_ID }, 'あ'.repeat(201)),
                ),
            ).toBe('reason_required');
            expect(user.props.role.value).toBe('viewer');
        });
    });

    it('同じ User の中で BAN した後に解除すると、BAN 前の役割に戻る', () => {
        const user = create(Role.EDITOR);
        user.ban({ userId: MANAGER_ID }, '一時停止');
        user.unban({ userId: MANAGER_ID }, null);

        expect(user.props.role.value).toBe('editor');
        expect(newChanges(user).map((c) => [c.fromRole, c.toRole])).toEqual([
            ['editor', 'viewer'],
            ['viewer', 'editor'],
        ]);
    });

    it('id は auth.users の id（profiles.user_id）', () => {
        expect(create(Role.REPORTER).id.value).toBe(TARGET_ID);
    });
});
