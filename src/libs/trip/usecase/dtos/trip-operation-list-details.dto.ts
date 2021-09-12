import { Expose, Type } from 'class-transformer';
import { OperationDetailsDto } from 'src/libs/operation/usecase/dtos/operation-details.dto';
import { TimeDetailsDto } from './time-details.dto';
import { TripDetailsDto } from './trip-details.dto';

export class TripOperationListDetailsDto {
    @Expose()
    id: string;

    @Expose()
    tripId: string;

    @Expose()
    operationId: string;

    @Expose()
    startTimeId: string;

    @Expose()
    endTimeId: string;

    @Expose()
    startStationId: string;

    @Expose()
    endStationId: string;

    @Expose()
    createdAt: Date;

    @Expose()
    updatedAt: Date;

    @Expose()
    @Type(() => TripDetailsDto)
    trip?: TripDetailsDto;

    @Expose()
    @Type(() => OperationDetailsDto)
    operation?: OperationDetailsDto;

    @Expose()
    @Type(() => TimeDetailsDto)
    startTime?: TimeDetailsDto;

    @Expose()
    @Type(() => TimeDetailsDto)
    endTime?: TimeDetailsDto;
}
