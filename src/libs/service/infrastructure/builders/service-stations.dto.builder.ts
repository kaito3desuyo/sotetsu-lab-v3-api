import { plainToClass } from 'class-transformer';
import { transformerOptions } from 'src/core/configs/transformer-options';
import { StationModel } from 'src/libs/station/infrastructure/models/station.model';
import { ServiceStationsDto } from '../../usecase/dtos/service-stations.dto';
import { ServiceModel } from '../models/service.model';

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
