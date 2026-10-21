import { plainToClass } from 'class-transformer';
import { transformerOptions } from '../../../../core/configs/transformer-options.js';
import { TripBlockDetailsDto } from '../../usecase/dtos/trip-block-details.dto.js';
import { TripBlockModel } from '../models/trip-block.model.js';

export const TripBlockDtoBuilder = {
    buildFromModel: (model: TripBlockModel): TripBlockDetailsDto => {
        return plainToClass(TripBlockDetailsDto, model, transformerOptions);
    },
} as const;

export const TripBlocksDtoBuilder = {
    buildFromModel: (models: TripBlockModel[]): TripBlockDetailsDto[] => {
        return models.map((model) => TripBlockDtoBuilder.buildFromModel(model));
    },
} as const;
