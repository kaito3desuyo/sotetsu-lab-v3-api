import { Injectable } from '@nestjs/common';
import { CalendarQuery } from '../infrastructure/queries/calendar.query';
import { CalendarDetailsDto } from './dtos/calendar-details.dto';

@Injectable()
export class CalendarV3Service {
    constructor(private readonly calendarQuery: CalendarQuery) {}

    findOneBySpecificDate(params: {
        date: string;
    }): Promise<CalendarDetailsDto> {
        const { date } = params;

        return this.calendarQuery.findOneBySpecificDate({
            date,
        });
    }
}
