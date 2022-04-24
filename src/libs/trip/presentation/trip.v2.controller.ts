import { Controller, Get, Req, Res } from '@nestjs/common';
import { Crud, CrudRequest, Override, ParsedRequest } from '@nestjsx/crud';
import { Request, Response } from 'express';
import { isArray } from 'lodash';
import { addPaginationHeaders } from 'src/core/util/pagination-header';
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
// @UseGuards(AuthGuard('jwt'))
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

        if (isArray(trips)) {
            res.json(trips);
        } else {
            addPaginationHeaders(req, res, trips);
            res.json(trips.data);
        }
    }
}
