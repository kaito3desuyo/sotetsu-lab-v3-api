import { Injectable } from '@nestjs/common';
import { CrudRequest, GetManyDefaultResponse } from '@nestjsx/crud';
import { OperationSightingCommand } from '../infrastructure/command/operation-sighting.command';
import { OperationSightingQuery } from '../infrastructure/query/operation-sighting.query';
import { OperationSightingDomainBuilder } from './builders/operation-sighting.domain.builder';
import { CreateOperationSightingDto } from './dtos/create-operation-sighting.dto';
import { OperationSightingDetailsDto } from './dtos/operation-sighting-details.dto';

@Injectable()
export class OperationSightingV2Service {
    constructor(
        private readonly operationSightingCommand: OperationSightingCommand,
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

    async createOne(
        query: CrudRequest,
        dto: CreateOperationSightingDto,
    ): Promise<OperationSightingDetailsDto> {
        const domain = OperationSightingDomainBuilder.buildByCreateDto(dto);
        const result = await this.operationSightingCommand.createOneOperationSighting(
            query,
            domain,
        );
        return result;
    }
}
