import { Nested } from 'src/core/types/nested';
import { Expose, Type } from 'class-transformer';
import { TripOperationListDetailsDto } from 'src/libs/trip/usecase/dtos/trip-operation-list-details.dto';
import { OperationDetailsDto } from './operation-details.dto';

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
