import { OperationSighting } from '../../domain/operation-sighting.domain';
import { OperationSightingModel } from '../models/operation-sighting.model';

export const OperationSightingModelBuilder = {
    buildFromDomain: (domain: OperationSighting): OperationSightingModel => {
        return {
            id: domain.id.value,
            formationId: domain.props.formationId,
            operationId: domain.props.operationId,
            sightingTime: domain.props.sightingTime,
        };
    },
} as const;
