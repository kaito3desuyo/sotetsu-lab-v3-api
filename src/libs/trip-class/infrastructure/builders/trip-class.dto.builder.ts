import { plainToClass } from 'class-transformer';
import { transformerOptions } from '../../../../core/configs/transformer-options.js';
import { TripClassModel } from '../models/trip-class.model.js';
import { TripClassDetailsDto } from '../../usecase/dtos/trip-class-details.dto.js';

export const TripClassDtoBuilder = {
    buildFromModel: (model: TripClassModel): TripClassDetailsDto => {
        return plainToClass(TripClassDetailsDto, model, transformerOptions);
    },
} as const;

export const TripClassesDtoBuilder = {
    buildFromModel: (models: TripClassModel[]): TripClassDetailsDto[] => {
        return models.map((model) => TripClassDtoBuilder.buildFromModel(model));
    },
} as const;
