import { plainToClass } from 'class-transformer';
import { transformerOptions } from 'src/core/configs/transformer-options';
import { AgencyModel } from 'src/libs/agency/infrastructure/models/agency.model';
import { ServiceAgenciesDto } from '../../usecase/dtos/service-agencies.dto';
import { ServiceModel } from '../models/service.model';

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
