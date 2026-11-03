import { Injectable } from '@nestjs/common';
import { isRole, Role } from '../../../core/modules/rbac/role.enum.js';
import { UserRoleQuery } from '../infrastructure/queries/user-role.query.js';

/**
 * profiles.role をその場で読む。JWT の役割は発行から最大 1 時間古いので、BAN・昇格を即座に効かせるために使う。
 * キャッシュしない。
 */
@Injectable()
export class UserRoleService {
    constructor(private readonly query: UserRoleQuery) {}

    /** 行が無い・知らない役割なら null */
    async findRole(userId: string): Promise<Role | null> {
        const value = await this.query.findRoleValue(userId);
        return isRole(value) ? value : null;
    }
}
