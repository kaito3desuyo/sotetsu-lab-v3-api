import type { Nested } from '../../../../core/types/nested.js';
import { Expose, Type } from 'class-transformer';
import { CalendarDetailsDto } from '../../../calendar/usecase/dtos/calendar-details.dto.js';
import { TripOperationListDetailsDto } from '../../../trip/usecase/dtos/trip-operation-list-details.dto.js';
import { BaseOperationDto } from './base-operation.dto.js';

export class OperationDetailsDto extends BaseOperationDto {
    @Expose()
    id: string;

    @Expose()
    operationId: string;

    @Expose()
    calendarId: string;

    @Expose()
    operationNumber: string;

    @Expose()
    createdAt: Date;

    @Expose()
    updatedAt: Date;

    @Expose()
    @Type(() => CalendarDetailsDto)
    calendar?: Nested<CalendarDetailsDto>;

    @Expose()
    @Type(() => TripOperationListDetailsDto)
    tripOperationLists?: Nested<TripOperationListDetailsDto[]>;

    @Expose()
    operationSightings?: any[];
}
