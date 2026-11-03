import { UserRoleChange } from '../../domain/user-role-change.domain.js';
import { UserRoleChangeModel } from '../models/user-role-change.model.js';

export const UserRoleChangeModelBuilder = {
    buildFromDomain: (domain: UserRoleChange): UserRoleChangeModel => {
        return {
            id: domain.id.value,
            userId: domain.props.userId,
            changedBy: domain.props.changedBy,
            fromRole: domain.props.fromRole.value,
            toRole: domain.props.toRole.value,
            reason: domain.props.reason?.value ?? null,
        };
    },
} as const;
