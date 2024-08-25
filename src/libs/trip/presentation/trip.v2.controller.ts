import { Crud, CrudRequest, Override, ParsedRequest } from '@dataui/crud';
import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { isArray } from 'lodash';
import { AuthGuard } from 'src/core/modules/auth/auth.guard';
import { addPaginationHeaders } from 'src/core/utils/pagination-header';
import { BaseTripDto } from '../usecase/dtos/base-trip.dto';
import { TripV2Service } from '../usecase/trip.v2.service';

@Crud({
    model: {
        type: BaseTripDto,
    },
    routes: {
        only: ['getManyBase'],
    },
    query: {
        join: {
            ['tripBlock']: {},
            ['tripBlock.trips']: { alias: 'tripBlockTrips' },
            ['tripBlock.trips.times']: { alias: 'tripBlockTripsTimes' },
            ['times']: {},
            ['tripOperationLists']: { alias: 'tripOperationLists' },
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
export class TripV2Controller {
    constructor(private readonly tripV2Service: TripV2Service) {}

    @Override('getManyBase')
    @Get()
    async findMany(
        @ParsedRequest() crudReq: CrudRequest,
        @Req() req: Request,
        @Res() res: Response,
    ): Promise<void> {
        const trips = await this.tripV2Service.findMany(crudReq);

        res.header('Cache-Control', 'max-age=1, must-revalidate');

        if (isArray(trips)) {
            res.json(trips);
        } else {
            addPaginationHeaders(req, res, trips);
            res.json(trips.data);
        }
    }
}
