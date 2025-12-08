import { OperationSightingManagementLog } from '../../domain/operation-sighting-management-log.domain';
import { OperationSightingManagementLogModel } from '../models/operation-sighting-management-log.model';

export const OperationSightingManagementLogModelBuilder = {
    buildFromDomain: (
        domain: OperationSightingManagementLog,
    ): OperationSightingManagementLogModel => {
        return {
            id: domain.id.value,
            operationSightingId: domain.props.operationSightingId,
            userId: domain.props.userId,
            action: domain.props.action,
            reason: domain.props.reason,
        };
    },
} as const;
