import { plainToClass } from 'class-transformer';
import { transformerOptions } from '../../../../core/configs/transformer-options.js';
import { AgencyModel } from '../../../agency/infrastructure/models/agency.model.js';
import { ServiceAgenciesDto } from '../../usecase/dtos/service-agencies.dto.js';
import { ServiceModel } from '../models/service.model.js';

export const ServiceAgenciesDtoBuilder = {
    buildFromModel: (model: {
        service: ServiceModel;
        agencies: AgencyModel[];
    }) => {
        const { service, agencies } = model;
        return plainToClass(
            ServiceAgenciesDto,
            { service, agencies },
            transformerOptions,
        );
    },
} as const;
