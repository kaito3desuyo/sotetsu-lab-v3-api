import { Exclude, Type } from 'class-transformer';
import { ArrayNotEmpty, IsOptional, ValidateNested } from 'class-validator';
import { ETripDirection } from '../../special/enums/trip.enum';
import { CreateTimeDto } from './create-time.dto';
import { CreateTripOperationListDto } from './create-trip-operation-list.dto';
import { ValidatableTripDto } from './validatable-trip.dto';

export class CreateTripDto extends ValidatableTripDto {
    @IsOptional()
    @Exclude()
    id: undefined;

    serviceId: string;

    tripNumber: string;

    tripClassId: string;

    tripName: string | null;

    tripDirection: ETripDirection;

    @IsOptional()
    @Exclude()
    tripBlockId: undefined;

    depotIn: boolean;

    depotOut: boolean;

    calendarId: string | null;

    extraCalendarId: string | null;

    @ValidateNested({ each: true })
    @Type(() => CreateTimeDto)
    @ArrayNotEmpty()
    times: CreateTimeDto[];

    @ValidateNested({ each: true })
    @Type(() => CreateTripOperationListDto)
    // @ArrayNotEmpty()
    tripOperationLists: CreateTripOperationListDto[];
}
