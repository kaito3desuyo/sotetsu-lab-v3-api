import { CalendarDateExceptionType } from '../../infrastructure/models/calendar-date.model';

export abstract class BaseCalendarDateDto {
    id: string;
    calendarId: string;
    date: string;
    exceptionType: CalendarDateExceptionType;
    memo: string | null;
}
