import type { Nested } from '../../../../core/types/nested.js';
import { Exclude, Type } from 'class-transformer';
import { ArrayNotEmpty, IsOptional, ValidateNested } from 'class-validator';
import { ETripDirection } from '../../special/enums/trip.enum.js';
import { CreateTimeDto } from './create-time.dto.js';
import { CreateTripOperationListDto } from './create-trip-operation-list.dto.js';
import { ValidatableTripDto } from './validatable-trip.dto.js';

export class CreateTripDto extends ValidatableTripDto<undefined> {
    @IsOptional()
    @Exclude()
    id: undefined;

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
    @Type(() => CreateTimeDto)
    @ArrayNotEmpty()
    times!: Nested<CreateTimeDto[]>;

    @ValidateNested({ each: true })
    @Type(() => CreateTripOperationListDto)
    // @ArrayNotEmpty()
    tripOperationLists!: Nested<CreateTripOperationListDto[]>;
}
