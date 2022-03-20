import {
    Controller,
    Get,
    Param,
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
import { BaseCalendarDto } from '../usecase/dtos/base-calendar.dto';
import { Request, Response } from 'express';
import { CalendarV2Service } from '../usecase/calendar.v2.service';
import { isArray } from 'lodash';
import { addPaginationHeaders } from 'src/core/util/pagination-header';
import { CalendarDetailsDto } from '../usecase/dtos/calendar-details.dto';
import { CalendarFindManyBySpecificDateParam } from '../usecase/params/calendar-find-many-by-specific-date.param';

@Crud({
    model: {
        type: BaseCalendarDto,
    },
    routes: {
        only: ['getManyBase', 'getOneBase'],
    },
    query: {
        join: {
            service: {},
        },
    },
    params: {
        id: {
            field: 'id',
            type: 'uuid',
            primary: true,
        },
        date: {
            disabled: true,
        },
    },
})
@Controller()
export class CalendarV2Controller {
    constructor(private readonly calendarV2Service: CalendarV2Service) {}

    @Override('getManyBase')
    @Get()
    async findMany(
        @ParsedRequest() crudReq: CrudRequest,
        @Req() req: Request,
        @Res() res: Response,
    ): Promise<void> {
        const calendars = await this.calendarV2Service.findMany(crudReq);

        if (isArray(calendars)) {
            res.json(calendars);
        } else {
            addPaginationHeaders(req, res, calendars);
            res.json(calendars.data);
        }
    }

    @Get('as/of/:date')
    @UseInterceptors(CrudRequestInterceptor)
    async findManyBySpecificDate(
        @ParsedRequest() crudReq: CrudRequest,
        @Param() params: CalendarFindManyBySpecificDateParam,
        @Req() req: Request,
        @Res() res: Response,
    ): Promise<void> {
        const formations = await this.calendarV2Service.findManyBySpecificDate(
            crudReq,
            params,
        );

        if (isArray(formations)) {
            res.json(formations);
        } else {
            addPaginationHeaders(req, res, formations);
            res.json(formations.data);
        }
    }

    @Override('getOneBase')
    @Get(':id')
    async findOne(
        @ParsedRequest() crudReq: CrudRequest,
    ): Promise<CalendarDetailsDto> {
        const calendar = await this.calendarV2Service.findOne(crudReq);
        return calendar;
    }
}
