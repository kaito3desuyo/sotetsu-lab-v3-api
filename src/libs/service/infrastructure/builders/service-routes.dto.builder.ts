import { plainToClass } from 'class-transformer';
import { transformerOptions } from '../../../../core/configs/transformer-options.js';
import { ServiceRoutesDto } from '../../usecase/dtos/service-routes.dto.js';
import { ServiceModel } from '../models/service.model.js';

export const ServiceRoutesDtoBuilder = {
    buildFromModel: (model: ServiceModel): ServiceRoutesDto => {
        const sortedOperatingSystems = [...(model.operatingSystems ?? [])].sort(
            (a, b) => a.sequence - b.sequence,
        );

        const data = {
            service: {
                id: model.id,
                serviceName: model.serviceName,
                serviceDescription: model.serviceDescription,
                createdAt: model.createdAt,
                updatedAt: model.updatedAt,
            },
            routes: sortedOperatingSystems.map((os) => ({
                ...os.route,
                sequence: os.sequence,
                startRouteStationListId: os.startRouteStationListId,
                endRouteStationListId: os.endRouteStationListId,
            })),
        };

        return plainToClass(ServiceRoutesDto, data, transformerOptions);
    },
} as const;
