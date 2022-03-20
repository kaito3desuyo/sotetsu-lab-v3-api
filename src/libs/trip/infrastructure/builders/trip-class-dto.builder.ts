import { plainToClass } from 'class-transformer';
import { transformerOptions } from 'src/core/config/transformer-options';
import { TripClassModel } from 'src/libs/trip-class/infrastructure/models/trip-class.model';
import { TripClassDetailsDto } from 'src/libs/trip-class/usecase/dtos/trip-class-details.dto';

export function buildTripClassDetailsDto(
    model: TripClassModel,
): TripClassDetailsDto {
    return plainToClass(TripClassDetailsDto, model, transformerOptions);
}
