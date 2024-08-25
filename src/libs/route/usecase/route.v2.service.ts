import { CrudRequest, GetManyDefaultResponse } from '@dataui/crud';
import { Injectable } from '@nestjs/common';
import { RouteQuery } from '../infrastructure/queries/route.query';
import { RouteDetailsDto } from './dtos/route-details.dto';

@Injectable()
export class RouteV2Service {
    constructor(private readonly routeQuery: RouteQuery) {}

    findMany(
        query: CrudRequest,
    ): Promise<RouteDetailsDto[] | GetManyDefaultResponse<RouteDetailsDto>> {
        return this.routeQuery.findManyRoutes(query);
    }

    findOne(query: CrudRequest): Promise<RouteDetailsDto> {
        return this.routeQuery.findOneRoute(query);
    }
}
