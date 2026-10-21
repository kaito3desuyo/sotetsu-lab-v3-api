import { Injectable, NotFoundException } from '@nestjs/common';
import { RouteQuery } from '../infrastructure/queries/route.query.js';
import { RouteDetailsDto } from './dtos/route-details.dto.js';
import { RouteStationsDto } from './dtos/route-stations.dto.js';

@Injectable()
export class RouteV3Service {
    constructor(private readonly routeQuery: RouteQuery) {}

    findMany(params?: { serviceName?: string }): Promise<RouteDetailsDto[]> {
        return this.routeQuery.findManyByServiceName(params);
    }

    async findOneWithStations(params: {
        routeId: string;
    }): Promise<RouteStationsDto> {
        const result = await this.routeQuery.findOneWithStations(params);

        if (!result) {
            throw new NotFoundException(
                `Route with ID "${params.routeId}" not found.`,
            );
        }

        return result;
    }
}
