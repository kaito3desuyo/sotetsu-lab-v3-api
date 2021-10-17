import { Injectable } from '@nestjs/common';
import { CrudRequest, GetManyDefaultResponse } from '@nestjsx/crud';
import { OperationSightingQuery } from '../infrastructure/query/operation-sighting.query';
import { OperationSightingDetailsDto } from './dtos/operation-sighting-details.dto';

@Injectable()
export class OperationSightingV2Service {
    constructor(
        private readonly operationSightingQuery: OperationSightingQuery,
    ) {}

    findMany(
        query: CrudRequest,
    ): Promise<
        | OperationSightingDetailsDto[]
        | GetManyDefaultResponse<OperationSightingDetailsDto>
    > {
        return this.operationSightingQuery.findManyOperationSightings(query);
    }

    findManyLatestGroupByOperation(
        query: CrudRequest,
    ): Promise<
        | OperationSightingDetailsDto[]
        | GetManyDefaultResponse<OperationSightingDetailsDto>
    > {
        return this.operationSightingQuery.findManyLatestOperationSightingsGroupByOperation(
            query,
        );
    }

    findManyLatestGroupByFormation(
        query: CrudRequest,
    ): Promise<
        | OperationSightingDetailsDto[]
        | GetManyDefaultResponse<OperationSightingDetailsDto>
    > {
        return this.operationSightingQuery.findManyLatestOperationSightingsGroupByFormation(
            query,
        );
    }

    findOne(query: CrudRequest): Promise<OperationSightingDetailsDto> {
        return this.operationSightingQuery.findOneOperationSighting(query);
    }
}
