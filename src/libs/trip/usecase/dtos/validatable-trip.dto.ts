import {
    IsBoolean,
    IsEnum,
    IsString,
    IsUUID,
    ValidateIf,
} from 'class-validator';
import { ETripDirection } from '../../special/enums/trip.enum.js';
import { BaseTripDto } from './base-trip.dto.js';

export abstract class ValidatableTripDto<
    Id extends string | undefined = string,
> extends BaseTripDto<Id> {
    @IsUUID()
    id!: Id;

    @IsUUID()
    serviceId!: string;

    @IsString()
    tripNumber!: string;

    @IsUUID()
    tripClassId!: string;

    @IsString()
    @ValidateIf((_, v) => v !== null)
    tripName!: string | null;

    @IsEnum(ETripDirection)
    tripDirection!: number;

    @IsUUID()
    tripBlockId!: Id;

    @IsBoolean()
    depotIn!: boolean;

    @IsBoolean()
    depotOut!: boolean;

    @IsUUID()
    @ValidateIf((_, v) => v !== null)
    calendarId!: string | null;

    @IsUUID()
    @ValidateIf((_, v) => v !== null)
    extraCalendarId!: string | null;
}
