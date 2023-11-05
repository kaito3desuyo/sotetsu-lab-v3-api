import { Injectable } from '@nestjs/common';
import { CrudRequest, GetManyDefaultResponse } from '@nestjsx/crud';
import { isArray } from 'lodash';
import { OperationDetailsDto } from '../../usecase/dtos/operation-details.dto';
import {
    OperationsDtoBuilder,
    buildOperationDetailsDto,
} from '../builders/operation-dto.builder';
import { OperationRepository } from '../repositories/operation.repository';
import { FindManyOptions } from 'typeorm';
import { OperationModel } from '../models/operation.model';

@Injectable()
export class OperationQuery {
    constructor(private readonly operationRepository: OperationRepository) {}

    async findMany(
        options?: FindManyOptions<OperationModel>,
    ): Promise<OperationDetailsDto[]> {
        const models = await this.operationRepository.find(options);
        return OperationsDtoBuilder.buildFromModel(models);
    }

    // =========================================================================

    async findManyOperations(
        query: CrudRequest,
    ): Promise<
        OperationDetailsDto[] | GetManyDefaultResponse<OperationDetailsDto>
    > {
        const models = await this.operationRepository.getMany(query);

        if (isArray(models)) {
            return models.map((o) => buildOperationDetailsDto(o));
        } else {
            const data = models.data.map((o) => buildOperationDetailsDto(o));
            return {
                ...models,
                data,
            };
        }
    }

    async findOneOperation(query: CrudRequest): Promise<OperationDetailsDto> {
        const model = await this.operationRepository.getOne(query);

        if (!model) {
            return null;
        }

        return buildOperationDetailsDto(model);
    }

    async findAllOperationNumbers(calendarId: string): Promise<string[]> {
        const data = await this.operationRepository
            .createQueryBuilder('operation')
            .select('operation.operation_number')
            .where('operation.calendar_id = :calendarId', { calendarId })
            .andWhere('operation.operation_number != :number', {
                number: '100',
            })
            .orderBy(
                "regexp_replace(operation.operation_number , '\\d', '', 'g')",
            )
            .addOrderBy('length(operation.operation_number)')
            .addOrderBy('operation.operation_number')
            .getRawMany<{ operation_number: string }>();

        return data.map((o) => o.operation_number);
    }
}
