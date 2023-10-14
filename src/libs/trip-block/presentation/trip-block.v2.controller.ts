import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseArrayPipe,
    Patch,
    Post,
    Put,
    Req,
    Res,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
    Crud,
    CrudRequest,
    CrudRequestInterceptor,
    Override,
    ParsedRequest,
} from '@nestjsx/crud';
import { Request, Response } from 'express';
import { isArray } from 'lodash';
import { validationPipeOptions } from 'src/core/config/validator-options';
import { addPaginationHeaders } from 'src/core/util/pagination-header';
import { AddTripToTripBlockDto } from '../usecase/dtos/add-trip-to-trip-block.dto';
import { BaseTripBlockDto } from '../usecase/dtos/base-trip-block.dto';
import { CreateTripBlockDto } from '../usecase/dtos/create-trip-block.dto';
import { DeleteTripFromTripBlockDto } from '../usecase/dtos/delete-trip-from-trip-block.dto';
import { ReplaceTripBlockDto } from '../usecase/dtos/replace-trip-block.dto';
import { TripBlockDetailsDto } from '../usecase/dtos/trip-block-details.dto';
import { AddTripToTripBlockParam } from '../usecase/params/add-trip-to-trip-block.param';
import { DeleteTripFromTripBlockParam } from '../usecase/params/delete-trip-from-trip-block.param';
import { ReplaceTripBlockParam } from '../usecase/params/replace-trip-block.param';
import { TripBlockV2Service } from '../usecase/trip-block.v2.service';

@Crud({
    model: {
        type: BaseTripBlockDto,
    },
    routes: {
        only: ['getManyBase', 'createManyBase', 'replaceOneBase'],
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
@UseGuards(AuthGuard('jwt'))
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

    @Override('createManyBase')
    @Post('/bulk')
    async createMany(
        @ParsedRequest() crudReq: CrudRequest,
        @Body(
            new ParseArrayPipe({
                ...validationPipeOptions,
                items: CreateTripBlockDto,
            }),
        )
        body: CreateTripBlockDto[],
    ): Promise<TripBlockDetailsDto[]> {
        const tripBlocks = await this.tripBlockV2Service.createManyTripBlocks(
            crudReq,
            body,
        );
        return tripBlocks;
    }

    @Override('replaceOneBase')
    @Put('/:id')
    async replaceOne(
        @ParsedRequest() crudReq: CrudRequest,
        @Param() params: ReplaceTripBlockParam,
        @Body() body: ReplaceTripBlockDto,
    ): Promise<TripBlockDetailsDto> {
        const tripBlock = await this.tripBlockV2Service.replaceOneTripBlock(
            crudReq,
            {
                ...body,
                id: params.id,
            },
        );
        return tripBlock;
    }

    @Patch('/:id/add-trip')
    @UseInterceptors(CrudRequestInterceptor)
    async addTripToTripBlock(
        @ParsedRequest() crudReq: CrudRequest,
        @Param() params: AddTripToTripBlockParam,
        @Body() body: AddTripToTripBlockDto,
    ): Promise<TripBlockDetailsDto> {
        const tripBlock = await this.tripBlockV2Service.addTripToTripBlock(
            crudReq,
            {
                ...body,
                id: params.id,
            },
        );
        return tripBlock;
    }

    @Patch('/:id/delete-trip')
    @UseInterceptors(CrudRequestInterceptor)
    async deleteTripFromTripBlock(
        @ParsedRequest() crudReq: CrudRequest,
        @Param() params: DeleteTripFromTripBlockParam,
        @Body() body: DeleteTripFromTripBlockDto,
    ): Promise<TripBlockDetailsDto> {
        const tripBlock = await this.tripBlockV2Service.deleteTripFromTripBlock(
            crudReq,
            {
                ...body,
                id: params.id,
            },
        );
        return tripBlock;
    }
}
