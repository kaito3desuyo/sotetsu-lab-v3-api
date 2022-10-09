import { Exclude, Type } from 'class-transformer';
import { ArrayNotEmpty, ValidateNested } from 'class-validator';
import { CreateTripDto } from 'src/libs/trip/usecase/dtos/create-trip.dto';
import { BaseTripBlockDto } from './base-trip-block.dto';

export class CreateTripBlockDto extends BaseTripBlockDto {
    @Exclude()
    id: undefined;

    @ValidateNested({ each: true })
    @Type(() => CreateTripDto)
    @ArrayNotEmpty()
    trips: CreateTripDto[];
}
