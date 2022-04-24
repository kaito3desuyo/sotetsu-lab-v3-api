import { plainToClass } from 'class-transformer';
import { transformerOptions } from 'src/core/config/transformer-options';
import { TripBlockDetailsDto } from '../../usecase/dtos/trip-block-details.dto';
import { TripBlockModel } from '../models/trip-block.model';

export function buildTripBlockDetailsDto(
    model: TripBlockModel,
): TripBlockDetailsDto {
    return plainToClass(TripBlockDetailsDto, model, transformerOptions);
}
