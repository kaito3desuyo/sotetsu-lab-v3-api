import { Injectable, NotFoundException } from '@nestjs/common';
import { ServiceQuery } from '../infrastructure/queries/service.query';
import { ServiceRoutesDto } from './dtos/service-routes.dto';

@Injectable()
export class ServiceV3Service {
    constructor(private readonly serviceQuery: ServiceQuery) {}

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
