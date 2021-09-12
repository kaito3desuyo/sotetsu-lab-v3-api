import { Injectable } from '@nestjs/common';
import { CrudRequest, GetManyDefaultResponse } from '@nestjsx/crud';
import { CalendarQuery } from '../infrastructure/queries/calendar.query';
import { CalendarDetailsDto } from './dtos/calendar-details.dto';
import { CalendarFindManyBySpecificDateParam } from './params/calendar-find-many-by-specific-date.param';

@Injectable()
export class CalendarV2Service {
    constructor(private readonly calendarQuery: CalendarQuery) {}

    findMany(
        query: CrudRequest,
    ): Promise<
        CalendarDetailsDto[] | GetManyDefaultResponse<CalendarDetailsDto>
    > {
        return this.calendarQuery.findManyCalendars(query);
    }

    findManyBySpecificDate(
        query: CrudRequest,
        params: CalendarFindManyBySpecificDateParam,
    ): Promise<
        CalendarDetailsDto[] | GetManyDefaultResponse<CalendarDetailsDto>
    > {
        return this.calendarQuery.findManyCalendarsBySpecificDate(
            query,
            params,
        );
    }

    findOne(query: CrudRequest): Promise<CalendarDetailsDto> {
        return this.calendarQuery.findOneCalendar(query);
    }
}
