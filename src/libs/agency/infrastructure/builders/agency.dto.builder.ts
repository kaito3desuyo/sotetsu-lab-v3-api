import { plainToClass } from 'class-transformer';
import { transformerOptions } from '../../../../core/configs/transformer-options.js';
import { AgencyDetailsDto } from '../../usecase/dtos/agency-details.dto.js';
import { AgencyModel } from '../models/agency.model.js';

export const AgencyDtoBuilder = {
    buildFromModel: (model: AgencyModel): AgencyDetailsDto => {
        return plainToClass(AgencyDetailsDto, model, transformerOptions);
    },
} as const;

export const AgenciesDtoBuilder = {
    buildFromModel: (models: AgencyModel[]): AgencyDetailsDto[] => {
        return models.map((model) => AgencyDtoBuilder.buildFromModel(model));
    },
} as const;
