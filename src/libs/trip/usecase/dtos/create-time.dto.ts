import { Exclude } from 'class-transformer';
import { IsOptional } from 'class-validator';
import { ValidatableTimeDto } from './validatable-time.dto';

export class CreateTimeDto extends ValidatableTimeDto {
    @IsOptional()
    @Exclude()
    id: undefined;

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
