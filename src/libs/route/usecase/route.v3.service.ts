import { Injectable, NotFoundException } from '@nestjs/common';
import { selectionCacheKey } from '../../../core/modules/shared-cache/bypass.js';
import { SharedCache } from '../../../core/modules/shared-cache/shared-cache.js';
import { parseSelection } from '../../../core/utils/selection/parse-selection.js';
import { serializeSelection } from '../../../core/utils/selection/serialize-selection.js';
import { RouteQuery } from '../infrastructure/queries/route.query.js';
import { RouteDetailsDto } from './dtos/route-details.dto.js';
import { RouteStationsDto } from './dtos/route-stations.dto.js';
import {
    ROUTE_STATIONS_SELECTION_TREE,
    ROUTES_SELECTION_TREE,
} from './route-selection.js';

@Injectable()
export class RouteV3Service {
    constructor(
        private readonly routeQuery: RouteQuery,
        private readonly sharedCache: SharedCache,
    ) {}

    /** `include`・`fields` があれば選んだ関連・列だけを返す（docs/adr/0010-v3-include-and-fields.md） */
    async findMany(
        params: {
            serviceName?: string;
            include?: unknown;
            fields?: unknown;
            bypassCache?: boolean;
        } = {},
    ): Promise<RouteDetailsDto[] | Record<string, unknown>[]> {
        const { serviceName, include, fields, bypassCache } = params;
        const selection = parseSelection(
            { include, fields },
            ROUTES_SELECTION_TREE,
        );
        // 路線の一覧は書き込みの口が無く、失効するタグも無い（TTL か手で捨てる）
        return this.sharedCache.getOrLoad<
            RouteDetailsDto[] | Record<string, unknown>[]
        >({
            namespace: 'routes',
            key: [serviceName ?? '', selectionCacheKey({ include, fields })],
            tags: [],
            bypass: bypassCache,
            load: () =>
                selection
                    ? this.routeQuery.findManyByServiceNameWithSelection(
                          { serviceName },
                          selection,
                      )
                    : this.routeQuery.findManyByServiceName({ serviceName }),
        });
    }

    /** `include`・`fields` があれば選んだ関連・列だけを返す（docs/adr/0010-v3-include-and-fields.md） */
    async findOneWithStations(params: {
        routeId: string;
        include?: unknown;
        fields?: unknown;
    }): Promise<RouteStationsDto | Record<string, unknown>> {
        const { routeId, include, fields } = params;
        const tree = ROUTE_STATIONS_SELECTION_TREE;
        const selection = parseSelection({ include, fields }, tree);
        const result = await this.routeQuery.findOneWithStations({ routeId });

        if (!result) {
            throw new NotFoundException(
                `Route with ID "${routeId}" not found.`,
            );
        }

        return selection ? serializeSelection(result, tree, selection) : result;
    }
}
