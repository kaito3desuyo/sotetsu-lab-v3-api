import { plainToClass } from 'class-transformer';
import { transformerOptions } from 'src/core/configs/transformer-options';
import { TripBlockDetailsDto } from '../../usecase/dtos/trip-block-details.dto';
import { TripBlockModel } from '../models/trip-block.model';

export const TripBlockDtoBuilder = {
    buildFromModel: (model: TripBlockModel): TripBlockDetailsDto => {
        return plainToClass(TripBlockDetailsDto, model, transformerOptions);
    },
} as const;

export const TripBlocksDtoBuilder = {
    buildFromModel: (models: TripBlockModel[]): TripBlockDetailsDto[] => {
        return models.map((model) => TripBlockDtoBuilder.buildFromModel(model));
    },
};
