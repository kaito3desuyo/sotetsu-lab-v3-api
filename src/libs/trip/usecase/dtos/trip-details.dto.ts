import { Expose, Type } from 'class-transformer';

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
    times?: any[];

    @Expose()
    tripOperationLists?: any[];
}
