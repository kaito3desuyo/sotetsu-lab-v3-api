import { UniqueEntityId } from '../../../../core/classes/unique-entity-id.js';
import { UserRoleChanges } from '../../domain/user-role-change.domain.js';
import { UserRoleValue } from '../../domain/user-role-value.domain.js';
import { User } from '../../domain/user.domain.js';
import { UserWithLastBanRow } from '../queries/user.query.js';

export const UserDomainBuilder = {
    /** profiles の行と直近の BAN から組む。役割の変更は空（BAN・解除で足した分だけを保存する） */
    buildFromRow: (row: UserWithLastBanRow): User => {
        return User.create(
            {
                role: UserRoleValue.create(row.role),
                lastBanFromRole:
                    row.lastBanFromRole === null
                        ? null
                        : UserRoleValue.create(row.lastBanFromRole),
                roleChanges: UserRoleChanges.create(),
            },
            new UniqueEntityId(row.userId),
        );
    },
} as const;
