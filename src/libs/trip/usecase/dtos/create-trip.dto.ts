import { Exclude, Type } from 'class-transformer';
import {
    ArrayNotEmpty,
    IsBoolean,
    IsEnum,
    IsOptional,
    IsString,
    IsUUID,
    ValidateIf,
    ValidateNested,
} from 'class-validator';
import { ETripDirection } from '../../special/enums/trip.enum';
import { BaseTripDto } from './base-trip.dto';
import { CreateTimeDto } from './create-time.dto';
import { CreateTripOperationListDto } from './create-trip-operation-list.dto';

export class CreateTripDto extends BaseTripDto {
    @Exclude()
    id: undefined;

    @IsUUID()
    serviceId: string;

    @IsString()
    tripNumber: string;

    @IsUUID()
    tripClassId: string;

    @IsString()
    @ValidateIf((_, v) => v !== null)
    tripName: string | null;

    @IsEnum(ETripDirection)
    tripDirection: ETripDirection;

    @Exclude()
    tripBlockId: undefined;

    @IsBoolean()
    depotIn: boolean;

    @IsBoolean()
    depotOut: boolean;

    @IsUUID()
    @ValidateIf((_, v) => v !== null)
    calendarId: string | null;

    @IsUUID()
    @ValidateIf((_, v) => v !== null)
    extraCalendarId: string | null;

    @ValidateNested({ each: true })
    @Type(() => CreateTimeDto)
    @ArrayNotEmpty()
    times?: CreateTimeDto[];

    @ValidateNested({ each: true })
    @Type(() => CreateTripOperationListDto)
    @ArrayNotEmpty()
    tripOperationLists?: CreateTripOperationListDto[];
}
