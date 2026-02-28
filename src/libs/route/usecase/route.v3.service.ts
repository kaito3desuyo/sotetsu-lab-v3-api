import { Injectable, NotFoundException } from '@nestjs/common';
import { RouteQuery } from '../infrastructure/queries/route.query';
import { RouteStationsDto } from './dtos/route-stations.dto';

@Injectable()
export class RouteV3Service {
    constructor(private readonly routeQuery: RouteQuery) {}

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
