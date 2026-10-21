import type { Nested } from '../../../../core/types/nested.js';
import { Exclude, Type } from 'class-transformer';
import {
    ArrayNotEmpty,
    IsOptional,
    ValidateIf,
    ValidateNested,
} from 'class-validator';
import { ETripDirection } from '../../special/enums/trip.enum.js';
import { ReplaceTimeDto } from './replace-time.dto.js';
import { ReplaceTripOperationListDto } from './replace-trip-operation-list.dto.js';
import { ValidatableTripDto } from './validatable-trip.dto.js';

export class ReplaceTripDto extends ValidatableTripDto {
    @ValidateIf((_, v) => v !== undefined)
    id: string | undefined;

    serviceId!: string;

    tripNumber!: string;

    tripClassId!: string;

    tripName!: string | null;

    tripDirection!: ETripDirection;

    @IsOptional()
    @Exclude()
    tripBlockId: undefined;

    depotIn!: boolean;

    depotOut!: boolean;

    calendarId!: string | null;

    extraCalendarId!: string | null;

    @ValidateNested({ each: true })
    @Type(() => ReplaceTimeDto)
    @ArrayNotEmpty()
    times!: Nested<ReplaceTimeDto[]>;

    @ValidateNested({ each: true })
    @Type(() => ReplaceTripOperationListDto)
    // @ArrayNotEmpty()
    tripOperationLists!: Nested<ReplaceTripOperationListDto[]>;
}
