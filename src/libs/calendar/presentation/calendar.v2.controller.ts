import { Controller, Get, Req, Res } from '@nestjs/common';
import { Crud, CrudRequest, Override, ParsedRequest } from '@nestjsx/crud';
import { BaseCalendarDto } from '../usecase/dtos/base-calendar.dto';
import { Request, Response } from 'express';
import { CalendarV2Service } from '../usecase/calendar.v2.service';
import { isArray } from 'lodash';
import { addPaginationHeaders } from 'src/core/util/pagination-header';
import { CalendarDetailsDto } from '../usecase/dtos/calendar-details.dto';

@Crud({
    model: {
        type: BaseCalendarDto,
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

    @Override('getOneBase')
    @Get(':id')
    async findOne(
        @ParsedRequest() crudReq: CrudRequest,
    ): Promise<CalendarDetailsDto> {
        const calendar = await this.calendarV2Service.findOne(crudReq);
        return calendar;
    }
}
