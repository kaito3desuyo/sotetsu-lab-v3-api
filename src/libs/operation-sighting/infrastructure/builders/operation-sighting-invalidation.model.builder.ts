import { OperationSightingInvalidation } from '../../domain/operation-sighting-invalidation.domain';
import { OperationSightingInvalidationModel } from '../models/operation-sighting-invalidation.model';

export const OperationSightingInvalidationModelBuilder = {
    buildFromDomain: (
        domain: OperationSightingInvalidation,
    ): OperationSightingInvalidationModel => {
        return {
            id: domain.id.value,
            operationSightingId: domain.props.operationSightingId,
        };
    },
} as const;
