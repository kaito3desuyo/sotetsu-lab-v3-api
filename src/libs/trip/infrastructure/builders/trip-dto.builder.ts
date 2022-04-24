import { plainToClass } from 'class-transformer';
import { transformerOptions } from 'src/core/config/transformer-options';
import { TripDetailsDto } from '../../usecase/dtos/trip-details.dto';
import { TripModel } from '../models/trip.model';

export function buildTripDetailsDto(model: TripModel): TripDetailsDto {
    return plainToClass(TripDetailsDto, model, transformerOptions);
}
