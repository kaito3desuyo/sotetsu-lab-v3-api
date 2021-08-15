import { Injectable } from '@nestjs/common';
import { CrudRequest, GetManyDefaultResponse } from '@nestjsx/crud';
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
