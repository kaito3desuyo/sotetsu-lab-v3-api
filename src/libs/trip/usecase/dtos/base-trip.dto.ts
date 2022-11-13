export abstract class BaseTripDto {
    id: string;
    serviceId: string;
    tripNumber: string;
    tripClassId: string;
    tripName: string | null;
    tripDirection: number;
    tripBlockId: string;
    depotIn: boolean;
    depotOut: boolean;
    calendarId: string | null;
    extraCalendarId: string | null;
}
