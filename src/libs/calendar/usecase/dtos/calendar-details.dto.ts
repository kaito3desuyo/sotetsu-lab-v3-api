import { Expose } from 'class-transformer';
import { BaseCalendarDto } from './base-calendar.dto';

export class CalendarDetailsDto extends BaseCalendarDto {
    @Expose()
    id: string;

    @Expose()
    serviceId: string;

    @Expose()
    calendarName: string;

    @Expose()
    sunday: boolean;

    @Expose()
    monday: boolean;

    @Expose()
    tuesday: boolean;

    @Expose()
    wednesday: boolean;

    @Expose()
    thursday: boolean;

    @Expose()
    friday: boolean;

    @Expose()
    saturday: boolean;

    @Expose()
    startDate: string;

    @Expose()
    endDate: string;

    @Expose()
    createdAt: Date;

    @Expose()
    updatedAt: Date;
}
