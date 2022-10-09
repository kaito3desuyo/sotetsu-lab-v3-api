import { Type } from 'class-transformer';
import { ArrayNotEmpty, ValidateIf, ValidateNested } from 'class-validator';
import { ReplaceTripDto } from 'src/libs/trip/usecase/dtos/replace-trip.dto';
import { ValidatableTripBlockDto } from './validatable-trip-block.dto';

export class ReplaceTripBlockDto extends ValidatableTripBlockDto {
    @ValidateIf((_, v) => v !== undefined)
    id: string | undefined;

    @ValidateNested({ each: true })
    @Type(() => ReplaceTripDto)
    @ArrayNotEmpty()
    trips: ReplaceTripDto[];
}
