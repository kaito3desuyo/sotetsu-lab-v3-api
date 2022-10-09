import {
    IsInt,
    IsMilitaryTime,
    IsPositive,
    IsUUID,
    Min,
    ValidateIf,
} from 'class-validator';

export abstract class ValidatableTimeDto {
    @IsUUID()
    id: string;

    @IsUUID()
    tripId: string;

    @IsUUID()
    stationId: string;

    @IsUUID()
    @ValidateIf((_, v) => v !== null)
    stopId: string | null;

    @IsInt()
    @IsPositive()
    stopSequence: number;

    @IsInt()
    @Min(0)
    pickupType: number;

    @IsInt()
    @Min(0)
    dropoffType: number;

    @IsInt()
    @IsPositive()
    @ValidateIf((_, v) => v !== null)
    arrivalDays: number | null;

    @IsMilitaryTime()
    @ValidateIf((_, v) => v !== null)
    arrivalTime: string | null;

    @IsInt()
    @IsPositive()
    @ValidateIf((_, v) => v !== null)
    departureDays: number | null;

    @IsMilitaryTime()
    @ValidateIf((_, v) => v !== null)
    departureTime: string | null;
}
