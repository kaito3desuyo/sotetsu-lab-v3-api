import {
    Body,
    Controller,
    Get,
    Param,
    Post,
    Req,
    Res,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import {
    Crud,
    CrudRequest,
    CrudRequestInterceptor,
    Override,
    ParsedRequest,
} from '@nestjsx/crud';
import { Request, Response } from 'express';
import { isArray } from 'lodash';
import { AuthGuard } from 'src/core/modules/auth/auth.guard';
import { addPaginationHeaders } from 'src/core/utils/pagination-header';
import { BaseOperationSightingDto } from '../usecase/dtos/base-operation-sighting.dto';
import { CreateOperationSightingDto } from '../usecase/dtos/create-operation-sighting.dto';
import { OperationSightingDetailsDto } from '../usecase/dtos/operation-sighting-details.dto';
import { OperationSightingV2Service } from '../usecase/operation-sighting.v2.service';
import { OperationSightingTimeCrossSectionDto } from '../usecase/dtos/operation-sighting-time-cross-section.dto';

@Crud({
    model: {
        type: BaseOperationSightingDto,
    },
    routes: {
        only: ['getManyBase', 'getOneBase', 'createOneBase'],
    },
    query: {
        join: {
            operation: {},
            formation: {},
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
export class OperationSightingV2Controller {
    constructor(
        private readonly operationSightingV2Service: OperationSightingV2Service,
    ) {}

    @Override('getManyBase')
    @Get()
    async findMany(
        @ParsedRequest() crudReq: CrudRequest,
        // @Query() query: any,
        @Req() req: Request,
        @Res() res: Response,
    ): Promise<void> {
        const operationSightings =
            await this.operationSightingV2Service.findMany(crudReq);

        if (isArray(operationSightings)) {
            res.json(operationSightings);
        } else {
            addPaginationHeaders(req, res, operationSightings);
            res.json(operationSightings.data);
        }
    }

    @Get('latest/operation')
    @UseInterceptors(CrudRequestInterceptor)
    async findManyLatestGroupByOperation(
        @ParsedRequest() crudReq: CrudRequest,
        @Req() req: Request,
        @Res() res: Response,
    ): Promise<void> {
        const operationSightings =
            await this.operationSightingV2Service.findManyLatestGroupByOperation(
                crudReq,
            );

        if (isArray(operationSightings)) {
            res.json(operationSightings);
        } else {
            addPaginationHeaders(req, res, operationSightings);
            res.json(operationSightings.data);
        }
    }

    @Get('latest/formation')
    @UseInterceptors(CrudRequestInterceptor)
    async findManyLatestGroupByFormation(
        @ParsedRequest() crudReq: CrudRequest,
        @Req() req: Request,
        @Res() res: Response,
    ): Promise<void> {
        const operationSightings =
            await this.operationSightingV2Service.findManyLatestGroupByFormation(
                crudReq,
            );

        if (isArray(operationSightings)) {
            res.json(operationSightings);
        } else {
            addPaginationHeaders(req, res, operationSightings);
            res.json(operationSightings.data);
        }
    }

    @Override('getOneBase')
    @Get(':id')
    async findOne(
        @ParsedRequest() crudReq: CrudRequest,
    ): Promise<OperationSightingDetailsDto> {
        const operationSightings =
            await this.operationSightingV2Service.findOne(crudReq);
        return operationSightings;
    }

    @Get('time-cross-section/from-operation-number/:operationNumber')
    async findOneTimeCrossSectionFromOperationNumber(
        @Param() params: { operationNumber: string },
    ): Promise<OperationSightingTimeCrossSectionDto> {
        const result =
            await this.operationSightingV2Service.findOneTimeCrossSectionFromOperationNumber(
                params,
            );
        return result;
    }

    @Get('time-cross-section/from-formation-number/:formationNumber')
    async findOneTimeCrossSectionFromFormationNumber(
        @Param() params: { formationNumber: string },
    ): Promise<OperationSightingTimeCrossSectionDto> {
        const result =
            await this.operationSightingV2Service.findOneTimeCrossSectionFromFormationNumber(
                params,
            );
        return result;
    }

    @Override('createOneBase')
    @Post()
    async createOne(
        @ParsedRequest() crudReq: CrudRequest,
        @Body() body: CreateOperationSightingDto,
    ): Promise<OperationSightingDetailsDto> {
        const result = await this.operationSightingV2Service.createOne(
            crudReq,
            body,
        );
        return result;
    }
}
