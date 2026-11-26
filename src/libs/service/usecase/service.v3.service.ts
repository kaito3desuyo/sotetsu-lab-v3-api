import { Injectable, NotFoundException } from '@nestjs/common';
import { selectionCacheKey } from '../../../core/modules/shared-cache/bypass.js';
import { SharedCache } from '../../../core/modules/shared-cache/shared-cache.js';
import {
    parseFieldsOnly,
    parseSelection,
} from '../../../core/utils/selection/parse-selection.js';
import { serializeSelection } from '../../../core/utils/selection/serialize-selection.js';
import { ServiceQuery } from '../infrastructure/queries/service.query.js';
import { ServiceAgenciesDto } from './dtos/service-agencies.dto.js';
import { ServiceDetailsDto } from './dtos/service-details.dto.js';
import { ServiceRoutesDto } from './dtos/service-routes.dto.js';
import { ServiceStationsDto } from './dtos/service-stations.dto.js';
import {
    SERVICE_AGENCIES_SELECTION_TREE,
    SERVICE_ROUTES_SELECTION_TREE,
    SERVICE_SELECTION_TREE,
} from './service-selection.js';
import { SERVICE_STATIONS_SELECTION_TREE } from './service-stations-selection.js';

@Injectable()
export class ServiceV3Service {
    constructor(
        private readonly serviceQuery: ServiceQuery,
        private readonly sharedCache: SharedCache,
    ) {}

    /** `fields` があれば選んだ列だけを返す（docs/adr/0010-v3-include-and-fields.md） */
    async findMany(
        params: {
            serviceName?: string;
            include?: unknown;
            fields?: unknown;
        } = {},
    ): Promise<ServiceDetailsDto[] | Record<string, unknown>[]> {
        const { serviceName, include, fields } = params;
        const selection = parseFieldsOnly(
            { include, fields },
            SERVICE_SELECTION_TREE,
        );
        const result = await this.serviceQuery.findManyByServiceName({
            serviceName,
        });
        if (!selection) return result;
        return result.map((o) =>
            serializeSelection(o, SERVICE_SELECTION_TREE, selection),
        );
    }

    /** `include`・`fields` があれば選んだ関連・列だけを返す（docs/adr/0010-v3-include-and-fields.md） */
    async findOneStations(params: {
        serviceId: string;
        include?: unknown;
        fields?: unknown;
        bypassCache?: boolean;
    }): Promise<ServiceStationsDto | Record<string, unknown>> {
        const { serviceId, include, fields, bypassCache } = params;
        const selection = parseSelection(
            { include, fields },
            SERVICE_STATIONS_SELECTION_TREE,
        );
        // 種別の駅は書き込みの口が無く、失効するタグも無い（TTL か手で捨てる）。
        // 無い種別は load で投げて置かない（あとでできても古い「無い」が残らないように）
        const result = await this.sharedCache.getOrLoad<
            ServiceStationsDto | Record<string, unknown>
        >({
            namespace: 'service-stations',
            key: [serviceId, selectionCacheKey({ include, fields })],
            tags: [],
            bypass: bypassCache,
            load: async () => {
                const loaded = selection
                    ? await this.serviceQuery.findOneStationsForServiceWithSelection(
                          { serviceId },
                          selection,
                      )
                    : await this.serviceQuery.findOneStationsForService({
                          serviceId,
                      });
                if (!loaded) {
                    throw new NotFoundException(
                        `Service with ID "${serviceId}" not found.`,
                    );
                }
                return loaded;
            },
        });

        return result;
    }

    /** `include`・`fields` があれば選んだ関連・列だけを返す（docs/adr/0010-v3-include-and-fields.md） */
    async findOneWithAgencies(params: {
        serviceId: string;
        include?: unknown;
        fields?: unknown;
    }): Promise<ServiceAgenciesDto | Record<string, unknown>> {
        const { serviceId, include, fields } = params;
        const tree = SERVICE_AGENCIES_SELECTION_TREE;
        const selection = parseSelection({ include, fields }, tree);
        const result = await this.serviceQuery.findOneWithAgencies({
            serviceId,
        });

        if (!result) {
            throw new NotFoundException(
                `Service with ID "${serviceId}" not found.`,
            );
        }

        return selection ? serializeSelection(result, tree, selection) : result;
    }

    /** `include`・`fields` があれば選んだ関連・列だけを返す（docs/adr/0010-v3-include-and-fields.md） */
    async findOneWithRoutes(params: {
        serviceId: string;
        include?: unknown;
        fields?: unknown;
    }): Promise<ServiceRoutesDto | Record<string, unknown>> {
        const { serviceId, include, fields } = params;
        const tree = SERVICE_ROUTES_SELECTION_TREE;
        const selection = parseSelection({ include, fields }, tree);
        const result = await this.serviceQuery.findOneWithRoutes({ serviceId });

        if (!result) {
            throw new NotFoundException(
                `Service with ID "${serviceId}" not found.`,
            );
        }

        return selection ? serializeSelection(result, tree, selection) : result;
    }
}
