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
} as const;

export const OperationSightingLatestCachesModelBuilder = {
    buildFromDomain: (
        domains: OperationSightingLatestCache[],
    ): OperationSightingLatestCacheModel[] => {
        return domains.map((domain) =>
            OperationSightingLatestCacheModelBuilder.buildFromDomain(domain),
        );
    },
} as const;
