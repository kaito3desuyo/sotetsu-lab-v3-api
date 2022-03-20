export abstract class BaseTimeDto {
    id: string;
    tripId: string;
    stationId: string;
    stopId: string;
    stopSequence: number;
    pickupType: number;
    dropoffType: number;
    arrivalDays: number;
    arrivalTime: string;
    departureDays: number;
    departureTime: string;
}
