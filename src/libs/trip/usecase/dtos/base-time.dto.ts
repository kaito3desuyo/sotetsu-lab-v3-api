export abstract class BaseTimeDto {
    id: string;
    tripId: string;
    stationId: string;
    stopId: string | null;
    stopSequence: number;
    pickupType: number;
    dropoffType: number;
    arrivalDays: number | null;
    arrivalTime: string | null;
    departureDays: number | null;
    departureTime: string | null;
}
