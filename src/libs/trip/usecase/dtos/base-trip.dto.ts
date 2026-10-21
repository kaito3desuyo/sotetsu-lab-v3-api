export abstract class BaseTripDto<Id extends string | undefined = string> {
    id!: Id;
    serviceId!: string;
    tripNumber!: string;
    tripClassId!: string;
    tripName!: string | null;
    tripDirection!: number;
    tripBlockId!: Id;
    depotIn!: boolean;
    depotOut!: boolean;
    calendarId!: string | null;
    extraCalendarId!: string | null;
}
