import {
    Controller,
    Get,
    Query,
    Req,
    Res,
    UnprocessableEntityException,
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
import { OperationService } from 'src/libs/operation/usecase/operation.service';
import { OperationDetailsDto } from '../usecase/dtos/operation-details.dto';
import { Request, Response } from 'express';
import { OperationV2Service } from '../usecase/operation.v2.service';
import { isArray } from 'lodash';
import { addPaginationHeaders } from 'src/core/util/pagination-header';
import { BaseOperationDto } from '../usecase/dtos/base-operation.dto';
import { TripDetailsDto } from 'src/libs/trip/usecase/dtos/trip-details.dto';
import { TripOperationListDetailsDto } from 'src/libs/trip/usecase/dtos/trip-operation-list-details.dto';

@Crud({
    model: {
        type: BaseOperationDto,
    },
    routes: {
        only: ['getManyBase', 'getOneBase'],
    },
    query: {
        join: {
            ['calendar']: {},
            ['tripOperationLists']: {},
            ['tripOperationLists.trip']: {},
            ['tripOperationLists.startTime']: {},
            ['tripOperationLists.startTime.station']: {},
            ['tripOperationLists.endTime']: {},
            ['tripOperationLists.endTime.station']: {},
            // ['operationSightings']: {},
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
export class OperationV2Controller {
    constructor(
        private readonly operationService: OperationService,
        private readonly operationV2Service: OperationV2Service,
    ) {}

    @Override('getManyBase')
    @Get()
    async findMany(
        @ParsedRequest() crudReq: CrudRequest,
        @Req() req: Request,
        @Res() res: Response,
    ): Promise<void> {
        const operations = await this.operationV2Service.findMany(crudReq);

        if (isArray(operations)) {
            res.json(operations);
        } else {
            addPaginationHeaders(req, res, operations);
            res.json(operations.data);
        }
    }

    @Override('getOneBase')
    @Get(':id')
    async findOne(
        @ParsedRequest() crudReq: CrudRequest,
    ): Promise<OperationDetailsDto> {
        const operation = await this.operationV2Service.findOne(crudReq);
        return operation;
    }

    @Get(':id/current-position')
    @UseInterceptors(CrudRequestInterceptor)
    async findOneWithCurrentPosition(
        @ParsedRequest() crudReq: CrudRequest,
    ): Promise<{
        operation: OperationDetailsDto;
        position: {
            prev: TripOperationListDetailsDto;
            current: TripOperationListDetailsDto;
            next: TripOperationListDetailsDto;
        };
    }> {
        const result = await this.operationV2Service.findOneWithCurrentPosition(
            crudReq,
        );
        return result;
    }

    @Get('/trips')
    getOperationsTrips(@Query('calendar_id') calendarId: string) {
        if (!calendarId) {
            throw new UnprocessableEntityException(
                'Please set `calendar_id` query.',
            );
        }
        return this.operationService.findOperationTripsWithStartTimeAndEndTimeByCalendarId(
            calendarId,
        );
    }
}
