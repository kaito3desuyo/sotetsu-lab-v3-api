import type { Nested } from '../../../../core/types/nested.js';
import { Exclude, Type } from 'class-transformer';
import { ArrayNotEmpty, IsOptional, ValidateNested } from 'class-validator';
import { CreateTripDto } from '../../../trip/usecase/dtos/create-trip.dto.js';
import { ValidatableTripBlockDto } from './validatable-trip-block.dto.js';

export class CreateTripBlockDto extends ValidatableTripBlockDto {
    @IsOptional()
    @Exclude()
    id: undefined;

    @ValidateNested({ each: true })
    @Type(() => CreateTripDto)
    @ArrayNotEmpty()
    trips!: Nested<CreateTripDto[]>;
}
