import { UseCaseError } from '../../../core/classes/custom-error.js';
import { Role } from '../../../core/modules/rbac/role.enum.js';
import { ROLE_CHANGE_REASON_MAX_LENGTH } from '../moderation.constants.js';

/** 解除したとき、BAN の記録が無い viewer を戻す先 */
const DEFAULT_RESTORED_ROLE = Role.REPORTER;

/** 役割の書き換え 1 件。profiles.role の更新と user_role_changes の行はこれから作る */
export type RoleChange = {
    userId: string;
    changedBy: string;
    fromRole: string;
    toRole: string;
    reason: string | null;
};

type ModerationTargetProps = {
    userId: string;
    role: string;
    /** 直近の BAN（to_role = viewer）の from_role。記録が無ければ null */
    lastBanFromRole: string | null;
};

/**
 * 見回りの対象（投稿者）。BAN ＝ viewer への格下げ・解除 ＝ 直近の BAN の from_role へ戻す、の規則をここ 1 か所に置く。
 * 自分と MANAGER は BAN できない。すでに viewer の人は BAN できない。
 */
export class ModerationTarget {
    private constructor(private readonly props: ModerationTargetProps) {}

    static create(props: ModerationTargetProps): ModerationTarget {
        return new ModerationTarget(props);
    }

    ban(by: { userId: string }, reason: string): RoleChange {
        const { userId, role } = this.props;
        if (userId === by.userId) {
            throw new UseCaseError('自分自身は BAN できません', {
                reason: 'self',
                userId,
            });
        }
        if (role === Role.MANAGER) {
            throw new UseCaseError('MANAGER は BAN できません', {
                reason: 'manager',
                userId,
            });
        }
        if (role === Role.VIEWER) {
            throw new UseCaseError('すでに BAN されています', {
                reason: 'already_banned',
                userId,
            });
        }
        assertReason(reason, userId);

        return {
            userId,
            changedBy: by.userId,
            fromRole: role,
            toRole: Role.VIEWER,
            reason,
        };
    }

    unban(by: { userId: string }, reason: string | null): RoleChange {
        const { userId, role, lastBanFromRole } = this.props;
        if (role !== Role.VIEWER) {
            throw new UseCaseError('BAN されていません', {
                reason: 'not_banned',
                userId,
            });
        }
        if (reason !== null) {
            assertReason(reason, userId);
        }

        return {
            userId,
            changedBy: by.userId,
            fromRole: role,
            toRole: lastBanFromRole ?? DEFAULT_RESTORED_ROLE,
            reason,
        };
    }
}

function assertReason(reason: string, userId: string): void {
    const length = reason.trim().length;
    if (length < 1 || reason.length > ROLE_CHANGE_REASON_MAX_LENGTH) {
        throw new UseCaseError(
            `理由は 1〜${ROLE_CHANGE_REASON_MAX_LENGTH} 字で入力してください`,
            { reason: 'reason_required', userId },
        );
    }
}
