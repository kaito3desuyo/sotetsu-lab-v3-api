import { Crud, CrudRequest, Override, ParsedRequest } from '@dataui/crud';
import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { isArray } from 'lodash';
import { AuthGuard } from 'src/core/modules/auth/auth.guard';
import { addPaginationHeaders } from 'src/core/utils/pagination-header';
import { RouteModel } from '../infrastructure/models/route.model';
import { RouteV2Service } from '../usecase/route.v2.service';

@Crud({
    model: {
        type: RouteModel,
    },
    routes: {
        only: ['getManyBase', 'getOneBase'],
    },
    query: {
        join: {
            ['routeStationLists']: {},
            ['routeStationLists.station']: {},
            ['operatingSystems']: {},
            ['operatingSystems.service']: {},
        },
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
@UseGuards(AuthGuard)
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

        res.header('Cache-Control', 'max-age=2592000, must-revalidate');

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
        @Res() res: Response,
    ): Promise<void> {
        const route = await this.routeV2Service.findOne(crudReq);

        res.header('Cache-Control', 'max-age=2592000, must-revalidate');

        res.json(route);
    }
}
