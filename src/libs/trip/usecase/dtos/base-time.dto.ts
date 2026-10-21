export abstract class BaseTimeDto<Id extends string | undefined = string> {
    id!: Id;
    tripId!: Id;
    stationId!: string;
    stopId!: string | null;
    stopSequence!: number;
    pickupType!: number;
    dropoffType!: number;
    arrivalDays!: number | null;
    arrivalTime!: string | null;
    departureDays!: number | null;
    departureTime!: string | null;
}
