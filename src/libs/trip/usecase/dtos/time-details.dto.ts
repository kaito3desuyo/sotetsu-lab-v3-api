import { Expose, Type } from 'class-transformer';
import { TripDetailsDto } from './trip-details.dto';
import { TripOperationListDetailsDto } from './trip-operation-list-details.dto';

export class TimeDetailsDto {
    @Expose()
    id: string;

    @Expose()
    tripId: string;

    @Expose()
    stationId: string;

    @Expose()
    stopId: string;

    @Expose()
    stopSequence: number;

    @Expose()
    pickupType: number;

    @Expose()
    dropoffType: number;

    @Expose()
    arrivalDays: number;

    @Expose()
    arrivalTime: string;

    @Expose()
    departureDays: number;

    @Expose()
    departureTime: string;

    @Expose()
    createdAt: Date;

    @Expose()
    updatedAt: Date;

    @Expose()
    @Type(() => TripDetailsDto)
    trip?: TripDetailsDto;

    @Expose()
    station?: any;

    @Expose()
    stop?: any;

    @Expose()
    @Type(() => TripOperationListDetailsDto)
    startTripOperationLists?: TripOperationListDetailsDto[];

    @Expose()
    @Type(() => TripOperationListDetailsDto)
    endTripOperationLists?: TripOperationListDetailsDto[];
}
