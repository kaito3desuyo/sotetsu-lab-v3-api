import { Controller, Get, Req, Res } from '@nestjs/common';
import { Crud, CrudRequest, Override, ParsedRequest } from '@nestjsx/crud';
import { Request, Response } from 'express';
import { isArray } from 'lodash';
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
// @UseGuards(AuthGuard('jwt'))
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

        if (isArray(tripClasses)) {
            res.json(tripClasses);
        } else {
            addPaginationHeaders(req, res, tripClasses);
            res.json(tripClasses.data);
        }
    }
}
