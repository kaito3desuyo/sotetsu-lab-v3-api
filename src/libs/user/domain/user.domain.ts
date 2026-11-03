import { AggregatedRoot } from '../../../core/classes/aggregated-root.js';
import { UseCaseError } from '../../../core/classes/custom-error.js';
import { UniqueEntityId } from '../../../core/classes/unique-entity-id.js';
import { RoleChangeReason } from './role-change-reason.domain.js';
import { UserRoleChange, UserRoleChanges } from './user-role-change.domain.js';
import { UserRoleValue } from './user-role-value.domain.js';

type UserProps = {
    role: UserRoleValue;
    /** 読み込んだときの事実: 直近の BAN（to_role = viewer）の from_role。記録が無ければ null */
    lastBanFromRole: UserRoleValue | null;
    /** この操作で足した役割の変更（getNewItems() を保存する） */
    roleChanges: UserRoleChanges;
};

/**
 * 利用者（集約ルート。id は auth.users の id ＝ profiles.user_id）。BAN の不変条件だけを持つ。
 * 表示名などの要約は読み取り側（UserQuery → DTO）が作る。手がかり（user_access_traces）は量が多く、
 * BAN の不変条件に関わらないので集約に入れない（userId でこの集約を指す別の記録）。
 * BAN ＝ viewer への格下げ・解除 ＝ 直近の BAN の from_role へ戻す（記録が無ければ reporter）。
 */
export class User extends AggregatedRoot<UserProps> {
    private constructor(props: UserProps, id: UniqueEntityId) {
        super(props, id);
    }

    static create(props: UserProps, id: UniqueEntityId): User {
        return new User(props, id);
    }

    /** 外から役割を書き換えさせないよう読み取り専用で返す。変えるのは ban・unban だけ */
    get props(): Readonly<UserProps> {
        return this._props;
    }

    /** 自分と MANAGER は BAN できない。すでに viewer の人も BAN できない */
    ban(by: { userId: string }, reason: string): void {
        const userId = this.id.value;
        if (userId === by.userId) {
            throw new UseCaseError('自分自身は BAN できません', {
                reason: 'self',
                userId,
            });
        }
        if (this._props.role.isManager()) {
            throw new UseCaseError('MANAGER は BAN できません', {
                reason: 'manager',
                userId,
            });
        }
        if (this._props.role.isBanned()) {
            throw new UseCaseError('すでに BAN されています', {
                reason: 'already_banned',
                userId,
            });
        }
        const changeReason = RoleChangeReason.create(reason, { userId });

        const fromRole = this._props.role;
        this.changeRole({
            changedBy: by.userId,
            toRole: UserRoleValue.banned(),
            reason: changeReason,
        });
        this._props.lastBanFromRole = fromRole;
    }

    /** BAN されていない人は解除できない。理由は省略できる */
    unban(by: { userId: string }, reason: string | null): void {
        const userId = this.id.value;
        if (!this._props.role.isBanned()) {
            throw new UseCaseError('BAN されていません', {
                reason: 'not_banned',
                userId,
            });
        }
        const changeReason =
            reason === null
                ? null
                : RoleChangeReason.create(reason, { userId });

        this.changeRole({
            changedBy: by.userId,
            toRole:
                this._props.lastBanFromRole ?? UserRoleValue.defaultRestored(),
            reason: changeReason,
        });
    }

    private changeRole(params: {
        changedBy: string;
        toRole: UserRoleValue;
        reason: RoleChangeReason | null;
    }): void {
        this._props.roleChanges.add(
            UserRoleChange.create({
                userId: this.id.value,
                changedBy: params.changedBy,
                fromRole: this._props.role,
                toRole: params.toRole,
                reason: params.reason,
            }),
        );
        this._props.role = params.toRole;
    }
}
