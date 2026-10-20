import { Nested } from 'src/core/types/nested';
import { Expose, Type } from 'class-transformer';
import { TripBlockDetailsDto } from 'src/libs/trip-block/usecase/dtos/trip-block-details.dto';
import { TripClassDetailsDto } from 'src/libs/trip-class/usecase/dtos/trip-class-details.dto';
import { BaseTripDto } from './base-trip.dto';
import { TimeDetailsDto } from './time-details.dto';
import { TripOperationListDetailsDto } from './trip-operation-list-details.dto';

export class TripDetailsDto extends BaseTripDto {
    @Expose()
    id: string;

    @Expose()
    serviceId: string;

    @Expose()
    tripNumber: string;

    @Expose()
    tripClassId: string;

    @Expose()
    tripName: string;

    @Expose()
    tripDirection: number;

    @Expose()
    tripBlockId: string;

    @Expose()
    depotIn: boolean;

    @Expose()
    depotOut: boolean;

    @Expose()
    calendarId: string;

    @Expose()
    extraCalendarId: string;

    @Expose()
    createdAt: Date;

    @Expose()
    updatedAt: Date;

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
