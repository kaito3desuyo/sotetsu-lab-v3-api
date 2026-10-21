import { IsOptional, IsUUID } from 'class-validator';
import { BaseTripOperationListDto } from './base-trip-operation-list.dto.js';

export abstract class ValidatableTripOperationListDto<
    Id extends string | undefined = string,
> extends BaseTripOperationListDto<Id> {
    @IsUUID()
    id!: Id;

    @IsUUID()
    tripId!: Id;

    @IsUUID()
    operationId!: string;

    @IsUUID()
    startStationId!: string;

    @IsUUID()
    endStationId!: string;

    @IsUUID()
    startTimeId!: Id;

    @IsUUID()
    endTimeId!: Id;

    @IsOptional()
    @IsUUID()
    nextTripOperationListId?: string | null;
}
