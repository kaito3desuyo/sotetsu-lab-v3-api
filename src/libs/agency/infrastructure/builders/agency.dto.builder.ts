import { plainToClass } from 'class-transformer';
import { transformerOptions } from 'src/core/configs/transformer-options';
import { AgencyDetailsDto } from '../../usecase/dtos/agency-details.dto';
import { AgencyModel } from '../models/agency.model';

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
