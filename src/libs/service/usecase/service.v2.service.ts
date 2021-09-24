import { Injectable } from '@nestjs/common';
import { CrudRequest, GetManyDefaultResponse } from '@nestjsx/crud';
import { ServiceQuery } from '../infrastructure/queries/service.query';
import { ServiceDetailsDto } from './dtos/service-details.dto';

@Injectable()
export class ServiceV2Service {
    constructor(private readonly serviceQuery: ServiceQuery) {}

    findMany(
        query: CrudRequest,
    ): Promise<
        ServiceDetailsDto[] | GetManyDefaultResponse<ServiceDetailsDto>
    > {
        return this.serviceQuery.findManyServices(query);
    }

    findOne(query: CrudRequest): Promise<ServiceDetailsDto> {
        return this.serviceQuery.findOneService(query);
    }
}
