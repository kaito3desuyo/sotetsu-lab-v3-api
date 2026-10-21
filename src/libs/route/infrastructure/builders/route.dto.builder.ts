import { plainToClass } from 'class-transformer';
import { transformerOptions } from '../../../../core/configs/transformer-options.js';
import { RouteDetailsDto } from '../../usecase/dtos/route-details.dto.js';
import { RouteModel } from '../models/route.model.js';

export const RouteDtoBuilder = {
    buildFromModel: (model: RouteModel): RouteDetailsDto => {
        return plainToClass(RouteDetailsDto, model, transformerOptions);
    },
} as const;

export const RoutesDtoBuilder = {
    buildFromModel: (models: RouteModel[]): RouteDetailsDto[] => {
        return models.map((model) => RouteDtoBuilder.buildFromModel(model));
    },
} as const;
