import type { Nested } from '../../../../core/types/nested.js';
import { Type } from 'class-transformer';
import { ArrayNotEmpty, ValidateIf, ValidateNested } from 'class-validator';
import { ReplaceTripDto } from '../../../trip/usecase/dtos/replace-trip.dto.js';
import { ValidatableTripBlockDto } from './validatable-trip-block.dto.js';

export class ReplaceTripBlockDto extends ValidatableTripBlockDto {
    @ValidateIf((_, v) => v !== undefined)
    id: string | undefined;

    @ValidateNested({ each: true })
    @Type(() => ReplaceTripDto)
    @ArrayNotEmpty()
    trips: Nested<ReplaceTripDto[]>;
}
