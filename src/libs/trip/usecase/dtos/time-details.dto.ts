import { Expose, Type } from 'class-transformer';
import { StationDetailsDto } from 'src/libs/station/usecase/dtos/station-details.dto';
import { StopDetailsDto } from 'src/libs/station/usecase/dtos/stop-details.dto';
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
    @Type(() => StationDetailsDto)
    station?: StationDetailsDto;

    @Expose()
    @Type(() => StopDetailsDto)
    stop?: StopDetailsDto;

    @Expose()
    @Type(() => TripOperationListDetailsDto)
    startTripOperationLists?: TripOperationListDetailsDto[];

    @Expose()
    @Type(() => TripOperationListDetailsDto)
    endTripOperationLists?: TripOperationListDetailsDto[];
}
