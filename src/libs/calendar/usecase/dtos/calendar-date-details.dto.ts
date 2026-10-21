import type { Nested } from '../../../../core/types/nested.js';
import { Expose } from 'class-transformer';
import { BaseCalendarDateDto } from './base-calendar-date.dto.js';

export class CalendarDateDetailsDto extends BaseCalendarDateDto {
    @Expose()
    id: string;

    @Expose()
    calendarId: string;

    @Expose()
    date: string;

    @Expose()
    exceptionType: Nested<BaseCalendarDateDto['exceptionType']>;

    @Expose()
    memo: string | null;

    @Expose()
    createdAt: Date;

    @Expose()
    updatedAt: Date;
}
