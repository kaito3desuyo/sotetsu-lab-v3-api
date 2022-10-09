import { Exclude } from 'class-transformer';
import { IsOptional, ValidateIf } from 'class-validator';
import { ValidatableTimeDto } from './validatable-time.dto';

export class ReplaceTimeDto extends ValidatableTimeDto {
    @ValidateIf((_, v) => v !== undefined)
    id: string | undefined;

    @IsOptional()
    @Exclude()
    tripId: undefined;

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
