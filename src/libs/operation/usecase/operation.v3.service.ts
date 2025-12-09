import { Injectable } from '@nestjs/common';
import { OperationQuery } from '../infrastructure/queries/operation.query';
import { OperationDetailsDto } from './dtos/operation-details.dto';

@Injectable()
export class OperationV3Service {
    constructor(private readonly operationQuery: OperationQuery) {}

    findManyBySpecificPeriod(params: {
        start: string;
        end: string;
    }): Promise<OperationDetailsDto[]> {
        const { start, end } = params;

        return this.operationQuery.findManyBySpecificPeriod({
            start,
            end,
        });
    }
}
