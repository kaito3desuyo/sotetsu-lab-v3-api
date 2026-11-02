import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { ProfileModel } from '../../../user/infrastructure/models/profile.model.js';
import { RoleChange } from '../../domain/moderation-target.domain.js';
import { UserRoleChangeModel } from '../models/user-role-change.model.js';

@Injectable()
export class UserRoleChangeCommand {
    /** profiles.role の更新と user_role_changes の追加。呼び出し側のトランザクションの中で流す */
    async apply(change: RoleChange, manager: EntityManager): Promise<void> {
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
