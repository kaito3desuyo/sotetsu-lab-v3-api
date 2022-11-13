import { Exclude } from 'class-transformer';
import { IsOptional, ValidateIf } from 'class-validator';
import { ValidatableTripOperationListDto } from './validatable-trip-operation-list.dto';

export class ReplaceTripOperationListDto extends ValidatableTripOperationListDto {
    @ValidateIf((_, v) => v !== undefined)
    id: string | undefined;

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
