import { OperationSighting } from '../../domain/operation-sighting.domain';
import { OperationSightingModel } from '../models/operation-sighting.model';
import { OperationSightingInvalidationModelBuilder } from './operation-sighting-invalidation.model.builder';
import { OperationSightingManagementLogModelBuilder } from './operation-sighting-management-log.model.builder';

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
