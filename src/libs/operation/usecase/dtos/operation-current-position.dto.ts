import type { Nested } from '../../../../core/types/nested.js';
import { Expose, Type } from 'class-transformer';
import { TripOperationListDetailsDto } from '../../../trip/usecase/dtos/trip-operation-list-details.dto.js';
import { OperationDetailsDto } from './operation-details.dto.js';

export class OperationCurrentPositionDto {
    @Expose()
    @Type(() => OperationDetailsDto)
    operation: Nested<OperationDetailsDto>;

    @Expose()
    @Type(() => TripOperationListDetailsDto)
    prev: Nested<TripOperationListDetailsDto | null>;

    @Expose()
    @Type(() => TripOperationListDetailsDto)
    current: Nested<TripOperationListDetailsDto | null>;
    @Expose()
    @Type(() => TripOperationListDetailsDto)
    next: Nested<TripOperationListDetailsDto | null>;
}
