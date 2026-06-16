import { plainToClass } from 'class-transformer';
import { transformerOptions } from 'src/core/configs/transformer-options';
import { ServiceDetailsDto } from '../../usecase/dtos/service-details.dto';
import { ServiceModel } from '../models/service.model';

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
