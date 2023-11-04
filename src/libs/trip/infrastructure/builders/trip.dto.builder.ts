import { plainToClass } from 'class-transformer';
import { transformerOptions } from 'src/core/configs/transformer-options';
import { TripDetailsDto } from '../../usecase/dtos/trip-details.dto';
import { TripModel } from '../models/trip.model';

export const TripDtoBuilder = {
    buildFromModel: (model: TripModel): TripDetailsDto => {
        return plainToClass(TripDetailsDto, model, transformerOptions);
    },
} as const;

export const TripsDtoBuilder = {
    buildFromModel: (models: TripModel[]): TripDetailsDto[] => {
        return models.map((model) => TripDtoBuilder.buildFromModel(model));
    },
} as const;
