import type { Nested } from '../../../../core/types/nested.js';
import { Expose, Type } from 'class-transformer';
import { TripBlockDetailsDto } from '../../../trip-block/usecase/dtos/trip-block-details.dto.js';
import { TripClassDetailsDto } from '../../../trip-class/usecase/dtos/trip-class-details.dto.js';
import { BaseTripDto } from './base-trip.dto.js';
import { TimeDetailsDto } from './time-details.dto.js';
import { TripOperationListDetailsDto } from './trip-operation-list-details.dto.js';

export class TripDetailsDto extends BaseTripDto {
    @Expose()
    id!: string;

    @Expose()
    serviceId!: string;

    @Expose()
    tripNumber!: string;

    @Expose()
    tripClassId!: string;

    @Expose()
    tripName!: string;

    @Expose()
    tripDirection!: number;

    @Expose()
    tripBlockId!: string;

    @Expose()
    depotIn!: boolean;

    @Expose()
    depotOut!: boolean;

    @Expose()
    calendarId!: string;

    @Expose()
    extraCalendarId!: string;

    @Expose()
    createdAt!: Date;

    @Expose()
    updatedAt!: Date;

    @Expose()
    @Type(() => TimeDetailsDto)
    times?: Nested<TimeDetailsDto[]>;

    @Expose()
    @Type(() => TripOperationListDetailsDto)
    tripOperationLists?: Nested<TripOperationListDetailsDto[]>;

    @Expose()
    @Type(() => TripClassDetailsDto)
    tripClass?: Nested<TripClassDetailsDto>;

    @Expose()
    @Type(() => TripBlockDetailsDto)
    tripBlock?: Nested<TripBlockDetailsDto>;
}
