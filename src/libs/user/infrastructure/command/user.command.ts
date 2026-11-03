import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { User } from '../../domain/user.domain.js';
import { UserRoleChangeModelBuilder } from '../builders/user-role-change.model.builder.js';
import { ProfileModel } from '../models/profile.model.js';
import { UserRoleChangeModel } from '../models/user-role-change.model.js';

@Injectable()
export class UserCommand {
    /**
     * profiles.role の更新と、この操作で足した役割の変更（user_role_changes）の追加。
     * 呼び出し側のトランザクションの manager の中で流す
     */
    async save(user: User, manager: EntityManager): Promise<void> {
        await manager
            .createQueryBuilder()
            .update(ProfileModel)
            .set({ role: user.props.role.value })
            .where('user_id = :userId', { userId: user.id.value })
            .execute();

        for (const change of user.props.roleChanges.getNewItems()) {
            await manager
                .createQueryBuilder()
                .insert()
                .into(UserRoleChangeModel)
                .values(UserRoleChangeModelBuilder.buildFromDomain(change))
                .execute();
        }
    }
}
