import { Injectable } from '@nestjs/common';
import { CrudRequest, GetManyDefaultResponse } from '@nestjsx/crud';
import { OperationQuery } from '../infrastructure/queries/operation.query';
import { OperationDetailsDto } from './dtos/operation-details.dto';

@Injectable()
export class OperationV2Service {
    constructor(private readonly operationQuery: OperationQuery) {}

    findMany(
        query: CrudRequest,
    ): Promise<
        OperationDetailsDto[] | GetManyDefaultResponse<OperationDetailsDto>
    > {
        return this.operationQuery.findManyOperations(query);
    }

    findOne(query: CrudRequest): Promise<OperationDetailsDto> {
        return this.operationQuery.findOneOperation(query);
    }
}
