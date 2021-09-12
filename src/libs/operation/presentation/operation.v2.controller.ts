import {
    Controller,
    Get,
    Query,
    Req,
    Res,
    UnprocessableEntityException,
    UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Crud, CrudRequest, Override, ParsedRequest } from '@nestjsx/crud';
import { OperationService } from 'src/libs/operation/usecase/operation.service';
import { OperationDetailsDto } from '../usecase/dtos/operation-details.dto';
import { Request, Response } from 'express';
import { OperationV2Service } from '../usecase/operation.v2.service';
import { isArray } from 'lodash';
import { addPaginationHeaders } from 'src/core/util/pagination-header';

@Crud({
    model: {
        type: OperationDetailsDto,
    },
    routes: {
        only: ['getManyBase', 'getOneBase'],
    },
    query: {
        join: {},
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
