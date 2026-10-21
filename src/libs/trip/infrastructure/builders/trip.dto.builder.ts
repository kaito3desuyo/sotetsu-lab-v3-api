import { plainToClass } from 'class-transformer';
import { transformerOptions } from '../../../../core/configs/transformer-options.js';
import { TripDetailsDto } from '../../usecase/dtos/trip-details.dto.js';
import { TripModel } from '../models/trip.model.js';

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
