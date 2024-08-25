import { CrudRequest, GetManyDefaultResponse } from '@dataui/crud';
import { Injectable } from '@nestjs/common';
import { mergeWith } from 'lodash';
import {
    getDayOfWeek,
    isHoliday,
    isNewYear,
    isSpecialCalendarAvailable,
} from 'src/core/utils/day-of-week';
import { crudReqMergeCustomizer } from 'src/core/utils/merge-customizer';
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
            mergeWith(
                {
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
                                isSpecialCalendarAvailable(params.date)
                                    ? {
                                          sunday: false,
                                          monday: false,
                                          tuesday: false,
                                          wednesday: false,
                                          thursday: false,
                                          friday: false,
                                          saturday: false,
                                      }
                                    : isHoliday(params.date) ||
                                        isNewYear(params.date)
                                      ? { sunday: true }
                                      : { [getDayOfWeek(params.date)]: true },
                            ],
                        },
                    },
                },
                query,
                crudReqMergeCustomizer,
            ),
        );
    }

    findOne(query: CrudRequest): Promise<CalendarDetailsDto> {
        return this.calendarQuery.findOneCalendar(query);
    }
}
