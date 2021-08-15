import { Controller, Get, Req, Res } from '@nestjs/common';
import { Crud, CrudRequest, Override, ParsedRequest } from '@nestjsx/crud';
import { RouteModel } from '../infrastructure/models/route.model';
import e, { Request, Response } from 'express';
import { RouteV2Service } from '../usecase/route.v2.service';
import { get, isArray } from 'lodash';
import { addPaginationHeaders } from 'src/core/util/pagination-header';
import { RouteDetailsDto } from '../usecase/dtos/route-details.dto';

@Crud({
    model: {
        type: RouteModel,
    },
    routes: {
        only: ['getManyBase'],
    },
    params: {
        id: {
            field: 'id',
            type: 'uuid',
            primary: true,
        },
    },
})
@Controller()
export class RouteV2Controller {
    constructor(private readonly routeV2Service: RouteV2Service) {}

    @Override('getManyBase')
    @Get()
    async findMany(
        @ParsedRequest() crudReq: CrudRequest,
        @Req() req: Request,
        @Res() res: Response,
    ): Promise<void> {
        const routes = await this.routeV2Service.findMany(crudReq);

        if (isArray(routes)) {
            res.json(routes);
        } else {
            addPaginationHeaders(req, res, routes);
            res.json(routes.data);
        }
    }

    @Override('getOneBase')
    @Get(':id')
    async findOne(
        @ParsedRequest() crudReq: CrudRequest,
    ): Promise<RouteDetailsDto> {
        const route = await this.routeV2Service.findOne(crudReq);
        return route;
    }
}
