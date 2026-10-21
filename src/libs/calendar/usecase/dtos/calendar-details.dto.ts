import type { Nested } from '../../../../core/types/nested.js';
import { Expose, Type } from 'class-transformer';
import { ServiceDetailsDto } from '../../../service/usecase/dtos/service-details.dto.js';
import { BaseCalendarDto } from './base-calendar.dto.js';

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

    @Expose()
    @Type(() => ServiceDetailsDto)
    service?: Nested<ServiceDetailsDto>;
}
