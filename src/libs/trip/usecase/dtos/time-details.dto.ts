import type { Nested } from '../../../../core/types/nested.js';
import { Expose, Type } from 'class-transformer';
import { StationDetailsDto } from '../../../station/usecase/dtos/station-details.dto.js';
import { StopDetailsDto } from '../../../station/usecase/dtos/stop-details.dto.js';
import { TripDetailsDto } from './trip-details.dto.js';
import { TripOperationListDetailsDto } from './trip-operation-list-details.dto.js';

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
    trip?: Nested<TripDetailsDto>;

    @Expose()
    @Type(() => StationDetailsDto)
    station?: Nested<StationDetailsDto>;

    @Expose()
    @Type(() => StopDetailsDto)
    stop?: Nested<StopDetailsDto>;

    @Expose()
    @Type(() => TripOperationListDetailsDto)
    startTripOperationLists?: Nested<TripOperationListDetailsDto[]>;

    @Expose()
    @Type(() => TripOperationListDetailsDto)
    endTripOperationLists?: Nested<TripOperationListDetailsDto[]>;
}
