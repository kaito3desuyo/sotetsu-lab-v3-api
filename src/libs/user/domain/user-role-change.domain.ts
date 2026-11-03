import { Entity } from '../../../core/classes/entity.js';
import { UniqueEntityId } from '../../../core/classes/unique-entity-id.js';
import { WatchedList } from '../../../core/classes/watched-list.js';
import { RoleChangeReason } from './role-change-reason.domain.js';
import { UserRoleValue } from './user-role-value.domain.js';

type UserRoleChangeProps = {
    userId: string;
    changedBy: string;
    fromRole: UserRoleValue;
    toRole: UserRoleValue;
    reason: RoleChangeReason | null;
};

/** 役割の書き換え 1 件（BAN・解除）。user_role_changes の 1 行になる */
export class UserRoleChange extends Entity<UserRoleChangeProps> {
    private constructor(props: UserRoleChangeProps, id?: UniqueEntityId) {
        super(props, id);
    }

    static create(
        props: UserRoleChangeProps,
        id?: UniqueEntityId,
    ): UserRoleChange {
        return new UserRoleChange(props, id);
    }
}

/** 役割の変更の一覧。この操作で新しく足したものを getNewItems() で追う（消すことはできない） */
export class UserRoleChanges extends WatchedList<UserRoleChange> {
    private constructor(initial?: UserRoleChange[]) {
        super(initial);
        this._validateWhenCreating();
    }

    static create(changes?: UserRoleChange[]): UserRoleChanges {
        return new UserRoleChanges(changes);
    }

    public compareItems(a: UserRoleChange, b: UserRoleChange): boolean {
        return a.isEqual(b);
    }

    protected _validateWhenCreating(): void {}
    protected _validateWhenAdding(): void {}

    protected _validateWhenRemoving(): void {
        throw new Error('Removing items from UserRoleChanges is not allowed.');
    }
}
