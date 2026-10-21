import type { Nested } from '../../../../core/types/nested.js';
import { Expose, Type } from 'class-transformer';
import { TripOperationListDetailsDto } from '../../../trip/usecase/dtos/trip-operation-list-details.dto.js';
import { OperationDetailsDto } from './operation-details.dto.js';

export class OperationWithTripsDto {
    @Expose()
    @Type(() => OperationDetailsDto)
    operation!: Nested<OperationDetailsDto>;

    @Expose()
    @Type(() => TripOperationListDetailsDto)
    trips!: Nested<TripOperationListDetailsDto[]>;
}
