import { plainToClass } from 'class-transformer';
import { transformerOptions } from '../../../../core/configs/transformer-options.js';
import { StationModel } from '../../../station/infrastructure/models/station.model.js';
import { ServiceStationsDto } from '../../usecase/dtos/service-stations.dto.js';
import { ServiceModel } from '../models/service.model.js';

export const ServiceStationsDtoBuilder = {
    buildFromModel: (model: {
        service: ServiceModel;
        stations: StationModel[];
    }): ServiceStationsDto => {
        const { service, stations } = model;
        return plainToClass(
            ServiceStationsDto,
            { service, stations },
            transformerOptions,
        );
    },
} as const;
