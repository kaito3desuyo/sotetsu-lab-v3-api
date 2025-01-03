import { Crud, CrudRequest, Override, ParsedRequest } from '@dataui/crud';
import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { isArray } from 'lodash';
import { AuthGuard } from 'src/core/modules/auth/auth.guard';
import { addPaginationHeaders } from 'src/core/utils/pagination-header';
import { BaseTripClassDto } from '../usecase/dtos/base-trip-class.dto';
import { TripClassV2Service } from '../usecase/trip-class.v2.service';

@Crud({
    model: {
        type: BaseTripClassDto,
    },
    routes: {
        only: ['getManyBase'],
    },
    query: {
        join: {
            ['trips']: {},
            ['service']: {},
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
export class TripClassV2Controller {
    constructor(private readonly tripClassV2Service: TripClassV2Service) {}

    @Override('getManyBase')
    @Get()
    async findMany(
        @ParsedRequest() crudReq: CrudRequest,
        @Req() req: Request,
        @Res() res: Response,
    ): Promise<void> {
        const tripClasses = await this.tripClassV2Service.findMany(crudReq);

        res.header('Cache-Control', 'max-age=2592000, must-revalidate');

        if (isArray(tripClasses)) {
            res.json(tripClasses);
        } else {
            addPaginationHeaders(req, res, tripClasses);
            res.json(tripClasses.data);
        }
    }
}
