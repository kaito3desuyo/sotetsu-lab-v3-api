import { OperationSightingInvalidation } from '../../domain/operation-sighting-invalidation.domain.js';
import { OperationSightingInvalidationModel } from '../models/operation-sighting-invalidation.model.js';

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
