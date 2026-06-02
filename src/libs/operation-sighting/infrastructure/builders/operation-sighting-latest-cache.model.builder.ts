import { OperationSightingLatestCache } from '../../domain/operation-sighting-latest-cache.domain';
import { OperationSightingLatestCacheModel } from '../models/operation-sighting-latest-cache.model';

export const OperationSightingLatestCacheModelBuilder = {
    buildFromDomain: (
        domain: OperationSightingLatestCache,
    ): OperationSightingLatestCacheModel => {
        return {
            id: domain.id.value,
            operationNumber: domain.props.operationNumber,
            formationNumber: domain.props.formationNumber,
            operationSightingId: domain.props.operationSightingId,
        };
    },
    buildFromDomains: (
        domains: OperationSightingLatestCache[],
    ): OperationSightingLatestCacheModel[] => {
        return domains.map(
            OperationSightingLatestCacheModelBuilder.buildFromDomain,
        );
    },
} as const;
