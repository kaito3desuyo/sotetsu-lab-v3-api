import { plainToClass } from 'class-transformer';
import { transformerOptions } from '../../../../core/configs/transformer-options.js';
import { ServiceDetailsDto } from '../../usecase/dtos/service-details.dto.js';
import { ServiceModel } from '../models/service.model.js';

export const ServiceDtoBuilder = {
    buildFromModel: (model: ServiceModel): ServiceDetailsDto => {
        return plainToClass(ServiceDetailsDto, model, transformerOptions);
    },
} as const;

export const ServicesDtoBuilder = {
    buildFromModel: (models: ServiceModel[]): ServiceDetailsDto[] => {
        return models.map((model) => ServiceDtoBuilder.buildFromModel(model));
    },
} as const;
