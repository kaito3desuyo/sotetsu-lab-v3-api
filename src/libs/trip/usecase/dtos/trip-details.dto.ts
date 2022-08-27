import { Expose, Type } from 'class-transformer';
import { TripBlockDetailsDto } from 'src/libs/trip-block/usecase/dtos/trip-block-details.dto';
import { TripClassDetailsDto } from 'src/libs/trip-class/usecase/dtos/trip-class-details.dto';
import { TimeDetailsDto } from './time-details.dto';
import { TripOperationListDetailsDto } from './trip-operation-list-details.dto';

export class TripDetailsDto {
    @Expose()
    id: string;

    @Expose()
    serviceId: string;

    @Expose()
    tripNumber: string;

    @Expose()
    tripClassId: string;

    @Expose()
    tripName: string;

    @Expose()
    tripDirection: number;

    @Expose()
    tripBlockId: string;

    @Expose()
    depotIn: boolean;

    @Expose()
    depotOut: boolean;

    @Expose()
    calendarId: string;

    @Expose()
    extraCalendarId: string;

    @Expose()
    createdAt: Date;

    @Expose()
    updatedAt: Date;

    @Expose()
    @Type(() => TimeDetailsDto)
    times?: TimeDetailsDto[];

    @Expose()
    @Type(() => TripOperationListDetailsDto)
    tripOperationLists?: TripOperationListDetailsDto[];

    @Expose()
    @Type(() => TripClassDetailsDto)
    tripClass?: TripClassDetailsDto;

    @Expose()
    @Type(() => TripBlockDetailsDto)
    tripBlock?: TripBlockDetailsDto;
}
