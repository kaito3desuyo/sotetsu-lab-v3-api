import type { Nested } from '../../../../core/types/nested.js';
import { Expose, Type } from 'class-transformer';
import { OperationDetailsDto } from '../../../operation/usecase/dtos/operation-details.dto.js';
import { BaseTripOperationListDto } from './base-trip-operation-list.dto.js';
import { TimeDetailsDto } from './time-details.dto.js';
import { TripDetailsDto } from './trip-details.dto.js';

export class TripOperationListDetailsDto extends BaseTripOperationListDto {
    @Expose()
    id!: string;

    @Expose()
    tripId!: string;

    @Expose()
    operationId!: string;

    @Expose()
    startTimeId!: string;

    @Expose()
    endTimeId!: string;

    @Expose()
    startStationId!: string;

    @Expose()
    endStationId!: string;

    @Expose()
    nextTripOperationListId!: string | null;

    @Expose()
    createdAt!: Date;

    @Expose()
    updatedAt!: Date;

    @Expose()
    @Type(() => TripDetailsDto)
    trip?: Nested<TripDetailsDto>;

    @Expose()
    @Type(() => OperationDetailsDto)
    operation?: Nested<OperationDetailsDto>;

    @Expose()
    @Type(() => TimeDetailsDto)
    startTime?: Nested<TimeDetailsDto>;

    @Expose()
    @Type(() => TimeDetailsDto)
    endTime?: Nested<TimeDetailsDto>;
}
