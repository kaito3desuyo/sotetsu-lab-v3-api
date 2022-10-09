import { Exclude } from 'class-transformer';
import { IsUUID } from 'class-validator';
import { BaseTripOperationListDto } from './base-trip-operation-list.dto';

export class CreateTripOperationListDto extends BaseTripOperationListDto {
    @Exclude()
    id: undefined;

    @Exclude()
    tripId: undefined;

    @IsUUID()
    operationId: string;

    @IsUUID()
    startStationId: string;

    @IsUUID()
    endStationId: string;

    @Exclude()
    startTimeId: undefined;

    @Exclude()
    endTimeId: undefined;
}
