import {
    IsInt,
    IsMilitaryTime,
    IsPositive,
    IsUUID,
    Min,
    ValidateIf,
} from 'class-validator';
import { BaseTimeDto } from './base-time.dto.js';

export abstract class ValidatableTimeDto<
    Id extends string | undefined = string,
> extends BaseTimeDto<Id> {
    @IsUUID()
    id!: Id;

    @IsUUID()
    tripId!: Id;

    @IsUUID()
    stationId!: string;

    @IsUUID()
    @ValidateIf((_, v) => v !== null)
    stopId!: string | null;

    @IsInt()
    @IsPositive()
    stopSequence!: number;

    @IsInt()
    @Min(0)
    pickupType!: number;

    @IsInt()
    @Min(0)
    dropoffType!: number;

    @IsInt()
    @IsPositive()
    @ValidateIf((_, v) => v !== null)
    arrivalDays!: number | null;

    @IsMilitaryTime()
    @ValidateIf((_, v) => v !== null)
    arrivalTime!: string | null;

    @IsInt()
    @IsPositive()
    @ValidateIf((_, v) => v !== null)
    departureDays!: number | null;

    @IsMilitaryTime()
    @ValidateIf((_, v) => v !== null)
    departureTime!: string | null;
}
