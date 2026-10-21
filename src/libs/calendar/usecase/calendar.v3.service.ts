import { Injectable } from '@nestjs/common';
import { CalendarQuery } from '../infrastructure/queries/calendar.query.js';
import { CalendarDetailsDto } from './dtos/calendar-details.dto.js';

@Injectable()
export class CalendarV3Service {
    constructor(private readonly calendarQuery: CalendarQuery) {}

    findMany(params: {
        serviceName?: string;
    }): Promise<CalendarDetailsDto[]> {
        return this.calendarQuery.findManyByServiceName(params);
    }

    findOne(params: { id: string }): Promise<CalendarDetailsDto | null> {
        return this.calendarQuery.findOneById(params);
    }

    findOneBySpecificDate(params: {
        date: string;
    }): Promise<CalendarDetailsDto | undefined> {
        const { date } = params;

        return this.calendarQuery.findOneBySpecificDate({
            date,
        });
    }
}
