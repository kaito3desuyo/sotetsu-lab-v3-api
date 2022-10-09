import { IsUUID } from 'class-validator';

export abstract class ValidatableTripOperationListDto {
    @IsUUID()
    id: string;

    @IsUUID()
    tripId: string;

    @IsUUID()
    operationId: string;

    @IsUUID()
    startStationId: string;

    @IsUUID()
    endStationId: string;

    @IsUUID()
    startTimeId: string;

    @IsUUID()
    endTimeId: string;
}
