import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { ProfileModel } from '../models/profile.model.js';
import { UserRoleChangeModel } from '../models/user-role-change.model.js';

/** 役割の書き換え 1 件 */
export type UserRoleChange = {
    userId: string;
    changedBy: string;
    fromRole: string;
    toRole: string;
    reason: string | null;
};

@Injectable()
export class UserRoleChangeCommand {
    /** profiles.role の更新と user_role_changes の追加。呼び出し側のトランザクションの中で流す */
    async apply(change: UserRoleChange, manager: EntityManager): Promise<void> {
        await manager
            .createQueryBuilder()
            .update(ProfileModel)
            .set({ role: change.toRole })
            .where('user_id = :userId', { userId: change.userId })
            .execute();

        await manager
            .createQueryBuilder()
            .insert()
            .into(UserRoleChangeModel)
            .values({
                userId: change.userId,
                changedBy: change.changedBy,
                fromRole: change.fromRole,
                toRole: change.toRole,
                reason: change.reason,
            })
            .execute();
    }
}
