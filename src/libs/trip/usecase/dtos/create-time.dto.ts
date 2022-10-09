import { Exclude } from 'class-transformer';
import {
    IsInt,
    IsMilitaryTime,
    IsPositive,
    IsUUID,
    Min,
    ValidateIf,
} from 'class-validator';
import { BaseTimeDto } from './base-time.dto';

export class CreateTimeDto extends BaseTimeDto {
    @Exclude()
    id: undefined;

    @Exclude()
    tripId: undefined;

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
    @Min(0)
    @ValidateIf((_, v) => v !== null)
    arrivalDays: number | null;

    @IsMilitaryTime()
    @ValidateIf((_, v) => v !== null)
    arrivalTime: string | null;

    @IsInt()
    @Min(0)
    @ValidateIf((_, v) => v !== null)
    departureDays: number | null;

    @IsMilitaryTime()
    @ValidateIf((_, v) => v !== null)
    departureTime: string | null;
}
