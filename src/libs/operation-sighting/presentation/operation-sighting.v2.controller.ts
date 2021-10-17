import {
    Controller,
    Get,
    Query,
    Req,
    Res,
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
import { addPaginationHeaders } from 'src/core/util/pagination-header';
import { OperationSightingService } from '../application-service/operation-sighting.service';
import { BaseOperationSightingDto } from '../usecase/dtos/base-operation-sighting.dto';
import { OperationSightingDetailsDto } from '../usecase/dtos/operation-sighting-details.dto';
import { OperationSightingV2Service } from '../usecase/operation-sighting.v2.service';

@Crud({
    model: {
        type: BaseOperationSightingDto,
    },
    routes: {
        only: ['getManyBase', 'getOneBase'],
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
export class OperationSightingV2Controller {
    constructor(
        private readonly operationSightingService: OperationSightingService,
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
        const operationSightings = await this.operationSightingV2Service.findMany(
            crudReq,
        );

        if (isArray(operationSightings)) {
            res.json(operationSightings);
        } else {
            addPaginationHeaders(req, res, operationSightings);
            res.json(operationSightings.data);
        }
    }

    @Get('/latest')
    getLatestOperationSightings(@Query('calendar_id') calendarId: string) {
        return this.operationSightingService.findLatestBySightingTime(
            calendarId,
        );
    }

    @Get('latest/operation')
    @UseInterceptors(CrudRequestInterceptor)
    async findManyLatestGroupByOperation(
        @ParsedRequest() crudReq: CrudRequest,
        @Req() req: Request,
        @Res() res: Response,
    ): Promise<void> {
        const operationSightings = await this.operationSightingV2Service.findManyLatestGroupByOperation(
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
        const operationSightings = await this.operationSightingV2Service.findManyLatestGroupByFormation(
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
        const operationSightings = await this.operationSightingV2Service.findOne(
            crudReq,
        );
        return operationSightings;
    }
}
