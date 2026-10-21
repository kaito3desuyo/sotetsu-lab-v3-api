import { Exclude } from 'class-transformer';
import { IsOptional } from 'class-validator';
import { ValidatableTripOperationListDto } from './validatable-trip-operation-list.dto.js';

export class CreateTripOperationListDto extends ValidatableTripOperationListDto<undefined> {
    @IsOptional()
    @Exclude()
    id: undefined;

    @IsOptional()
    @Exclude()
    tripId: undefined;

    operationId!: string;

    startStationId!: string;

    endStationId!: string;

    @IsOptional()
    @Exclude()
    startTimeId: undefined;

    @IsOptional()
    @Exclude()
    endTimeId: undefined;

    nextTripOperationListId?: string | null;
}
