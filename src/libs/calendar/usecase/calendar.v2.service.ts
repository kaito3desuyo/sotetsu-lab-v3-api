import { Injectable } from '@nestjs/common';
import { CrudRequest, GetManyDefaultResponse } from '@nestjsx/crud';
import { merge } from 'lodash';
import { isHoliday, isNewYear, getDayOfWeek } from 'src/core/util/day-of-week';
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
        return this.calendarQuery.findManyCalendars(
            merge(query, {
                parsed: {
                    search: {
                        $and: [
                            {
                                $or: [
                                    {
                                        startDate: { $lte: params.date },
                                    },
                                    {
                                        startDate: null,
                                    },
                                ],
                            },
                            {
                                $or: [
                                    {
                                        endDate: { $gte: params.date },
                                    },
                                    {
                                        endDate: null,
                                    },
                                ],
                            },
                            isHoliday(params.date) || isNewYear(params.date)
                                ? { sunday: true }
                                : { [getDayOfWeek(params.date)]: true },
                        ],
                    },
                },
            }),
        );
    }

    findOne(query: CrudRequest): Promise<CalendarDetailsDto> {
        return this.calendarQuery.findOneCalendar(query);
    }
}
