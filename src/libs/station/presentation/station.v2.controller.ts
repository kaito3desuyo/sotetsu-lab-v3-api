import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { Crud, CrudRequest, Override, ParsedRequest } from '@nestjsx/crud';
import { Request, Response } from 'express';
import { isArray } from 'lodash';
import { AuthGuard } from 'src/core/modules/auth/auth.guard';
import { addPaginationHeaders } from 'src/core/utils/pagination-header';
import { StationDetailsDto } from '../usecase/dtos/station-details.dto';
import { StationV2Service } from '../usecase/station.v2.service';

@Crud({
    model: {
        type: StationDetailsDto,
    },
    routes: {
        only: ['getManyBase', 'getOneBase'],
    },
    query: {
        join: {
            ['routeStationLists']: {},
            ['routeStationLists.route']: {},
            ['times']: {},
            ['times.trip']: {
                alias: 'trip',
            },
            ['times.trip.tripClass']: {
                alias: 'tripClass',
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
export class StationV2Controller {
    constructor(private readonly stationV2Service: StationV2Service) {}

    @Override('getManyBase')
    @Get()
    async findMany(
        @ParsedRequest() crudReq: CrudRequest,
        @Req() req: Request,
        @Res() res: Response,
    ): Promise<void> {
        const stations = await this.stationV2Service.findMany(crudReq);

        if (isArray(stations)) {
            res.json(stations);
        } else {
            addPaginationHeaders(req, res, stations);
            res.json(stations.data);
        }
    }

    @Override('getOneBase')
    @Get()
    async findOne(
        @ParsedRequest() crudReq: CrudRequest,
    ): Promise<StationDetailsDto> {
        const station = await this.stationV2Service.findOne(crudReq);
        return station;
    }
}
