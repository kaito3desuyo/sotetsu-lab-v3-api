import { plainToClass } from 'class-transformer';
import { transformerOptions } from 'src/core/configs/transformer-options';
import { RouteDetailsDto } from '../../usecase/dtos/route-details.dto';
import { RouteModel } from '../models/route.model';

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
