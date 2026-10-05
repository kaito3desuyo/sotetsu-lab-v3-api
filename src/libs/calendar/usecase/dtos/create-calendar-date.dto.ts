import { IsIn, IsISO8601, IsOptional, IsString, IsUUID } from 'class-validator';
import {
    CALENDAR_DATE_EXCEPTION_TYPE_ADDED,
    CALENDAR_DATE_EXCEPTION_TYPE_REMOVED,
    CalendarDateExceptionType,
} from '../../infrastructure/models/calendar-date.model';

export class CreateCalendarDateDto {
    @IsUUID()
    calendarId: string;

    @IsISO8601()
    date: string;

    @IsIn([
        CALENDAR_DATE_EXCEPTION_TYPE_ADDED,
        CALENDAR_DATE_EXCEPTION_TYPE_REMOVED,
    ])
    exceptionType: CalendarDateExceptionType;

    @IsOptional()
    @IsString()
    memo?: string;
}
