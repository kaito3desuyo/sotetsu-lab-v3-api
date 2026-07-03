import { Injectable } from '@nestjs/common';
import { CalendarDateCommand } from '../infrastructure/command/calendar-date.command';
import { CalendarDateModel } from '../infrastructure/models/calendar-date.model';
import { CalendarDateQuery } from '../infrastructure/queries/calendar-date.query';
import { CalendarDateDetailsDto } from './dtos/calendar-date-details.dto';

@Injectable()
export class CalendarDateV3Service {
    constructor(
        private readonly calendarDateQuery: CalendarDateQuery,
        private readonly calendarDateCommand: CalendarDateCommand,
    ) {}

    findMany(params: {
        calendarId?: string;
        from?: string;
        to?: string;
    }): Promise<CalendarDateDetailsDto[]> {
        return this.calendarDateQuery.findMany(params);
    }

    create(params: {
        calendarId: string;
        date: string;
        exceptionType: CalendarDateModel['exceptionType'];
        memo?: string;
    }): Promise<CalendarDateDetailsDto> {
        return this.calendarDateCommand.create(params);
    }

    async deleteOneById(params: { id: string }): Promise<void> {
        await this.calendarDateCommand.deleteOneById(params);
    }
}
