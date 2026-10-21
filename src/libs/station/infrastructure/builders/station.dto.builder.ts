import { plainToClass } from 'class-transformer';
import { transformerOptions } from '../../../../core/configs/transformer-options.js';
import { StationDetailsDto } from '../../usecase/dtos/station-details.dto.js';
import { StationModel } from '../models/station.model.js';

export const StationDtoBuilder = {
    buildFromModel: (model: StationModel): StationDetailsDto => {
        return plainToClass(StationDetailsDto, model, transformerOptions);
    },
} as const;

export const StationsDtoBuilder = {
    buildFromModel: (models: StationModel[]): StationDetailsDto[] => {
        return models.map((model) => StationDtoBuilder.buildFromModel(model));
    },
} as const;
