import { CalendarDateExceptionType } from '../../infrastructure/models/calendar-date.model.js';

export abstract class BaseCalendarDateDto<
    Id extends string | undefined = string,
> {
    id!: Id;
    calendarId!: string;
    date!: string;
    exceptionType!: CalendarDateExceptionType;
    memo!: string | null;
}
