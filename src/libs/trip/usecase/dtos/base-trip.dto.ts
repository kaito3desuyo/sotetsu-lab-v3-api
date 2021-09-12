export abstract class BaseTripDto {
    id: string;
    serviceId: string;
    tripNumber: string;
    tripClassId: string;
    tripName: string;
    tripDirection: number;
    tripBlockId: string;
    depotIn: boolean;
    depotOut: boolean;
    calendarId: string;
    extraCalendarId: string;
}
