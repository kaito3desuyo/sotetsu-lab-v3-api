import { Exclude, Type } from 'class-transformer';
import { ArrayNotEmpty, IsOptional, ValidateNested } from 'class-validator';
import { CreateTripDto } from 'src/libs/trip/usecase/dtos/create-trip.dto';
import { ValidatableTripBlockDto } from './validatable-trip-block.dto';

export class CreateTripBlockDto extends ValidatableTripBlockDto {
    @IsOptional()
    @Exclude()
    id: undefined;

    @ValidateNested({ each: true })
    @Type(() => CreateTripDto)
    @ArrayNotEmpty()
    trips: CreateTripDto[];
}
