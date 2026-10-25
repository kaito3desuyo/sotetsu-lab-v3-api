import { Injectable, NotFoundException } from '@nestjs/common';
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
    constructor(private readonly routeQuery: RouteQuery) {}

    /** `include`・`fields` があれば選んだ関連・列だけを返す（docs/adr/0010-v3-include-and-fields.md） */
    async findMany(
        params: {
            serviceName?: string;
            include?: unknown;
            fields?: unknown;
        } = {},
    ): Promise<RouteDetailsDto[] | Record<string, unknown>[]> {
        const { serviceName, include, fields } = params;
        const selection = parseSelection(
            { include, fields },
            ROUTES_SELECTION_TREE,
        );
        return selection
            ? this.routeQuery.findManyByServiceNameWithSelection(
                  { serviceName },
                  selection,
              )
            : this.routeQuery.findManyByServiceName({ serviceName });
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
