import { plainToClass } from 'class-transformer';
import { transformerOptions } from 'src/core/configs/transformer-options';
import { ServiceDetailsDto } from '../../usecase/dtos/service-details.dto';
import { ServiceRoutesDto } from '../../usecase/dtos/service-routes.dto';
import { ServiceModel } from '../models/service.model';

export function buildServiceDetailsDto(model: ServiceModel): ServiceDetailsDto {
    return plainToClass(ServiceDetailsDto, model, transformerOptions);
}

export const ServiceDtoBuilder = {
    toRoutesDto: (model: ServiceModel) => {
        // operating_systemsをsequence順にソートして、routesを構築
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
