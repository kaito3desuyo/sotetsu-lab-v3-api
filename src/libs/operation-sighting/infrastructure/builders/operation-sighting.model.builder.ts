import { OperationSighting } from '../../domain/operation-sighting.domain.js';
import { OperationSightingModel } from '../models/operation-sighting.model.js';
import { OperationSightingInvalidationModelBuilder } from './operation-sighting-invalidation.model.builder.js';
import { OperationSightingManagementLogModelBuilder } from './operation-sighting-management-log.model.builder.js';

export const OperationSightingModelBuilder = {
    buildFromDomain: (domain: OperationSighting): OperationSightingModel => {
        return {
            id: domain.id.value,
            formationId: domain.props.formationId,
            operationId: domain.props.operationId,
            sightingTime: domain.props.sightingTime,
            invalidations: domain.props.invalidation
                ? [
                      OperationSightingInvalidationModelBuilder.buildFromDomain(
                          domain.props.invalidation,
                      ),
                  ]
                : [],
            managementLogs: domain.props.managementLogs
                .getItems()
                .map((log) =>
                    OperationSightingManagementLogModelBuilder.buildFromDomain(
                        log,
                    ),
                ),
        };
    },
} as const;
