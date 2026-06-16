import { Injectable, NotFoundException } from '@nestjs/common';
import { StationDetailsDto } from 'src/libs/station/usecase/dtos/station-details.dto';
import { ServiceQuery } from '../infrastructure/queries/service.query';
import { ServiceDetailsDto } from './dtos/service-details.dto';
import { ServiceRoutesDto } from './dtos/service-routes.dto';

@Injectable()
export class ServiceV3Service {
    constructor(private readonly serviceQuery: ServiceQuery) {}

    findMany(params?: { serviceName?: string }): Promise<ServiceDetailsDto[]> {
        return this.serviceQuery.findManyByServiceName(params);
    }

    async findOneStations(params: {
        serviceId: string;
    }): Promise<StationDetailsDto[]> {
        return this.serviceQuery.findOneStationsForService(params);
    }

    async findOneWithAgencies(params: { serviceId: string }): Promise<any> {
        const result = await this.serviceQuery.findOneWithAgencies(params);

        if (!result) {
            throw new NotFoundException(
                `Service with ID "${params.serviceId}" not found.`,
            );
        }

        return result;
    }

    async findOneWithRoutes(params: {
        serviceId: string;
    }): Promise<ServiceRoutesDto> {
        const result = await this.serviceQuery.findOneWithRoutes(params);

        if (!result) {
            throw new NotFoundException(
                `Service with ID "${params.serviceId}" not found.`,
            );
        }

        return result;
    }
}
