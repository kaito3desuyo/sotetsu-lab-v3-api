import { Exclude } from 'class-transformer';
import { IsOptional } from 'class-validator';
import { ValidatableTripOperationListDto } from './validatable-trip-operation-list.dto';

export class CreateTripOperationListDto extends ValidatableTripOperationListDto {
    @IsOptional()
    @Exclude()
    id: undefined;

    @IsOptional()
    @Exclude()
    tripId: undefined;

    operationId: string;

    startStationId: string;

    endStationId: string;

    @IsOptional()
    @Exclude()
    startTimeId: undefined;

    @IsOptional()
    @Exclude()
    endTimeId: undefined;
}
