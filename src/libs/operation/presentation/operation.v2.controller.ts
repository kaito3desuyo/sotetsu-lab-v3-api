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
import {
    Crud,
    CrudRequest,
    CrudRequestInterceptor,
    Override,
    ParsedRequest,
} from '@nestjsx/crud';
import dayjs from 'dayjs';
import { Request, Response } from 'express';
import { isArray } from 'lodash';
import { AuthGuard } from 'src/core/modules/auth/auth.guard';
import { addPaginationHeaders } from 'src/core/utils/pagination-header';
import { TripOperationListDetailsDto } from 'src/libs/trip/usecase/dtos/trip-operation-list-details.dto';
import { BaseOperationDto } from '../usecase/dtos/base-operation.dto';
import { OperationDetailsDto } from '../usecase/dtos/operation-details.dto';
import { OperationV2Service } from '../usecase/operation.v2.service';

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
            ['tripOperationLists.trip']: {
                alias: 'trip',
            },
            ['tripOperationLists.trip.times']: {},
            ['tripOperationLists.trip.tripClass']: {},
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
@UseGuards(AuthGuard)
export class OperationV2Controller {
    constructor(private readonly operationV2Service: OperationV2Service) {}

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

    @Get('/numbers')
    async findAllOperationNumbers(
        @Query('calendarId') calendarId: string,
    ): Promise<string[]> {
        if (!calendarId) {
            throw new UnprocessableEntityException(
                'Please set `calendarId` query.',
            );
        }

        return this.operationV2Service.findAllOperationNumbers(calendarId);
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
        @Res() res: Response,
    ): Promise<void> {
        const result = await this.operationV2Service.findOneWithCurrentPosition(
            crudReq,
        );

        const now = dayjs();
        const today = now.format('YYYY-MM-DD');

        const expiredAt = (days: number, time: string) =>
            dayjs(`${today} ${time}`, 'YYYY-MM-DD HH:mm:ss')
                .subtract(now.hour() < 4 ? 1 : 0, 'days')
                .add(days - 1, 'days');

        if (!!result.position.current) {
            res.appendHeader(
                'Expires',
                expiredAt(
                    result.position.current.endTime.arrivalDays,
                    result.position.current.endTime.arrivalTime,
                ).toString(),
            );
        } else if (!!result.position.next) {
            res.appendHeader(
                'Expires',
                expiredAt(
                    result.position.next.startTime.departureDays,
                    result.position.next.startTime.departureTime,
                ).toString(),
            );
        } else {
            res.appendHeader(
                'Expires',
                now
                    .add(now.hour() < 4 ? 0 : 1, 'days')
                    .hour(4)
                    .minute(0)
                    .second(0)
                    .millisecond(0)
                    .toString(),
            );
        }

        res.json(result);
    }

    @Get(':id/trips')
    @UseInterceptors(CrudRequestInterceptor)
    async findOneWithTrips(@ParsedRequest() crudReq: CrudRequest): Promise<{
        operation: OperationDetailsDto;
        trips: TripOperationListDetailsDto[];
    }> {
        const result = await this.operationV2Service.findOneWithTrips(crudReq);
        return result;
    }
}
