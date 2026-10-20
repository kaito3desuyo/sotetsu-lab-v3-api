import { Nested } from 'src/core/types/nested';
import { Expose, Type } from 'class-transformer';
import { CalendarDetailsDto } from 'src/libs/calendar/usecase/dtos/calendar-details.dto';
import { TripOperationListDetailsDto } from 'src/libs/trip/usecase/dtos/trip-operation-list-details.dto';
import { BaseOperationDto } from './base-operation.dto';

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
