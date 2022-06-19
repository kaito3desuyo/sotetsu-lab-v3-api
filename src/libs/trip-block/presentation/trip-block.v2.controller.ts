import { Controller, Get, Req, Res } from '@nestjs/common';
import { Crud, CrudRequest, Override, ParsedRequest } from '@nestjsx/crud';
import { BaseTripBlockDto } from '../usecase/dtos/base-trip-block.dto';
import { TripBlockV2Service } from '../usecase/trip-block.v2.service';
import { Request, Response } from 'express';
import { isArray } from 'lodash';
import { addPaginationHeaders } from 'src/core/util/pagination-header';

@Crud({
    model: {
        type: BaseTripBlockDto,
    },
    routes: {
        only: ['getManyBase'],
    },
    query: {},
    params: {
        id: {
            field: 'id',
            type: 'uuid',
            primary: true,
        },
    },
})
@Controller()
export class TripBlockV2Controller {
    constructor(private readonly tripBlockV2Service: TripBlockV2Service) {}

    @Override('getManyBase')
    @Get()
    async findMany(
        @ParsedRequest() crudReq: CrudRequest,
        @Req() req: Request,
        @Res() res: Response,
    ): Promise<void> {
        const tripBlocks = await this.tripBlockV2Service.findMany(crudReq);

        if (isArray(tripBlocks)) {
            res.json(tripBlocks);
        } else {
            addPaginationHeaders(req, res, tripBlocks);
            res.json(tripBlocks.data);
        }
    }
}
