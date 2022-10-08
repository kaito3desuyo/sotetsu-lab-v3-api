import { Controller, Get, Param, Patch, Req, Res } from '@nestjs/common';
import { Crud, CrudRequest, Override, ParsedRequest } from '@nestjsx/crud';
import { Request, Response } from 'express';
import { isArray } from 'lodash';
import { addPaginationHeaders } from 'src/core/util/pagination-header';
import { BaseTripBlockDto } from '../usecase/dtos/base-trip-block.dto';
import { TripBlockDetailsDto } from '../usecase/dtos/trip-block-details.dto';
import { AddTripToTripBlockParam } from '../usecase/params/add-trip-to-trip-block.param';
import { DeleteTripFromTripBlockParam } from '../usecase/params/delete-trip-from-trip-block.param';
import { TripBlockV2Service } from '../usecase/trip-block.v2.service';

@Crud({
    model: {
        type: BaseTripBlockDto,
    },
    routes: {
        only: ['getManyBase'],
    },
    query: {
        join: {
            ['trips']: {},
            ['trips.times']: {
                alias: 'times',
            },
            ['trips.tripOperationLists']: {
                alias: 'tripOperationLists',
            },
            ['trips.tripOperationLists.operation']: {
                alias: 'operation',
            },
            ['trips.tripClass']: {
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

    @Patch('/:tripBlockId/add-trip/:tripId')
    async addTripToTripBlock(
        @Param() params: AddTripToTripBlockParam,
    ): Promise<TripBlockDetailsDto> {
        const tripBlock = await this.tripBlockV2Service.addTripToTripBlock(
            params,
        );
        return tripBlock;
    }

    @Patch('/:tripBlockId/delete-trip/:tripId')
    async deleteTripFromTripBlock(
        @Param() params: DeleteTripFromTripBlockParam,
    ): Promise<TripBlockDetailsDto> {
        const tripBlock = await this.tripBlockV2Service.deleteTripFromTripBlock(
            params,
        );
        return tripBlock;
    }
}
