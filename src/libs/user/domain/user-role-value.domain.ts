import { ValueObject } from '../../../core/classes/value-object.js';
import { UnexpectedError } from '../../../core/classes/unexpected-error.js';
import { isRole, Role } from '../../../core/modules/rbac/role.enum.js';

type UserRoleValueProps = {
    value: Role;
};

/**
 * 利用者の役割。知らない文字列は受け取らない（DB の profiles.role が壊れていれば UnexpectedError）。
 * BAN ＝ viewer。BAN 済みか・MANAGER かは、呼び出し側が文字列を比べず、ここに聞く。
 */
export class UserRoleValue extends ValueObject<UserRoleValueProps> {
    private constructor(props: UserRoleValueProps) {
        super(props);
    }

    static create(value: string): UserRoleValue {
        if (!isRole(value)) {
            throw new UnexpectedError('知らない役割です', { role: value });
        }

        return new UserRoleValue({ value });
    }

    /** BAN された人の役割 */
    static banned(): UserRoleValue {
        return new UserRoleValue({ value: Role.VIEWER });
    }

    /** 解除したとき、BAN の記録が無い viewer を戻す先 */
    static defaultRestored(): UserRoleValue {
        return new UserRoleValue({ value: Role.REPORTER });
    }

    get value(): Role {
        return this.props.value;
    }

    /** viewer ＝ BAN 済み（記録の有無は問わない。記録の有無で「BAN と呼ぶか」を分けるのは読み取り側） */
    isBanned(): boolean {
        return this.props.value === Role.VIEWER;
    }

    isManager(): boolean {
        return this.props.value === Role.MANAGER;
    }
}
