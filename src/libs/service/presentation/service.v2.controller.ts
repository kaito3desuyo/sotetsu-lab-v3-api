import {
    Crud,
    CrudRequest,
    CrudRequestInterceptor,
    Override,
    ParsedRequest,
} from '@dataui/crud';
import {
    Controller,
    Get,
    Req,
    Res,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { isArray } from 'lodash';
import { AuthGuard } from 'src/core/modules/auth/auth.guard';
import { addPaginationHeaders } from 'src/core/utils/pagination-header';
import { ServiceModel } from '../infrastructure/models/service.model';
import { ServiceV2Service } from '../usecase/service.v2.service';

@Crud({
    model: {
        type: ServiceModel,
    },
    routes: {
        only: ['getManyBase', 'getOneBase'],
    },
    query: {
        join: {
            ['operatingSystems']: {},
            ['operatingSystems.route']: {
                alias: 'route',
            },
            ['operatingSystems.route.routeStationLists']: {
                alias: 'routeStationLists',
            },
            ['operatingSystems.route.routeStationLists.station']: {
                alias: 'routeStationListsStation',
            },
            ['operatingSystems.route.routeStationLists.station.routeStationLists']:
                {
                    alias: 'routeStationListsStationRouteStationLists',
                },
            ['operatingSystems.route.routeStationLists.station.routeStationLists.route']:
                {
                    alias: 'routeStationListsStationRouteStationListsRoute',
                },
            ['operatingSystems.route.routeStationLists.station.stops']: {
                alias: 'routeStationListsStationStops',
            },
            ['operatingSystems.startRouteStationList']: {
                alias: 'startRouteStationList',
            },
            ['operatingSystems.startRouteStationList.station']: {
                alias: 'startRouteStationListStation',
            },
            ['operatingSystems.endRouteStationList']: {
                alias: 'endRouteStationList',
            },
            ['operatingSystems.endRouteStationList.station']: {
                alias: 'endRouteStationListStation',
            },
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
export class ServiceV2Controller {
    constructor(private readonly serviceV2Service: ServiceV2Service) {}

    @Override('getManyBase')
    @Get()
    async findMany(
        @ParsedRequest() crudReq: CrudRequest,
        @Req() req: Request,
        @Res() res: Response,
    ): Promise<void> {
        const services = await this.serviceV2Service.findMany(crudReq);

        res.header('Cache-Control', 'max-age=2592000, must-revalidate');

        if (isArray(services)) {
            res.json(services);
        } else {
            addPaginationHeaders(req, res, services);
            res.json(services.data);
        }
    }

    @Override('getOneBase')
    @Get(':id')
    async findOne(
        @ParsedRequest() crudReq: CrudRequest,
        @Res() res: Response,
    ): Promise<void> {
        const service = await this.serviceV2Service.findOne(crudReq);

        res.header('Cache-Control', 'max-age=2592000, must-revalidate');

        res.json(service);
    }

    @Get(':id/stations')
    @UseInterceptors(CrudRequestInterceptor)
    async findOneWithStations(
        @ParsedRequest() crudReq: CrudRequest,
        @Res() res: Response,
    ): Promise<void> {
        const serviceStations =
            await this.serviceV2Service.findOneWithStations(crudReq);

        res.header('Cache-Control', 'max-age=2592000, must-revalidate');

        res.json(serviceStations);
    }
}
