import { Expose, Type } from 'class-transformer';
import { TripOperationListDetailsDto } from 'src/libs/trip/usecase/dtos/trip-operation-list-details.dto';
import { OperationDetailsDto } from './operation-details.dto';

export class OperationWithTripsDto {
    @Expose()
    @Type(() => OperationDetailsDto)
    operation: OperationDetailsDto;

    @Expose()
    @Type(() => TripOperationListDetailsDto)
    trips: TripOperationListDetailsDto[];
}
