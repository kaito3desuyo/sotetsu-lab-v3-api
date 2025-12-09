import { CrudRequest, GetManyDefaultResponse } from '@dataui/crud';
import { TypeOrmCrudService } from '@dataui/crud-typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import dayjs from 'dayjs';
import { isArray } from 'lodash';
import {
    FindManyOptions,
    IsNull,
    LessThanOrEqual,
    MoreThanOrEqual,
    Or,
    Repository,
} from 'typeorm';
import { OperationDetailsDto } from '../../usecase/dtos/operation-details.dto';
import {
    OperationsDtoBuilder,
    buildOperationDetailsDto,
} from '../builders/operation-dto.builder';
import { OperationModel } from '../models/operation.model';

@Injectable()
export class OperationQuery extends TypeOrmCrudService<OperationModel> {
    constructor(
        @InjectRepository(OperationModel)
        private readonly operationRepository: Repository<OperationModel>,
    ) {
        super(operationRepository);
    }

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
        const models = await this.getMany(query);

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

    async findManyBySpecificPeriod(params: {
        start: string;
        end: string;
    }): Promise<OperationDetailsDto[]> {
        const { start, end } = params;

        const format = 'YYYY-MM-DD';
        const startDate = dayjs(start, format);
        const endDate = dayjs(end, format);

        const result = await this.operationRepository.find({
            relations: ['calendar'],
            where: {
                calendar: {
                    startDate: Or(
                        LessThanOrEqual(endDate.format(format)),
                        IsNull(),
                    ),
                    endDate: Or(
                        MoreThanOrEqual(startDate.format(format)),
                        IsNull(),
                    ),
                },
            },
        });

        return OperationsDtoBuilder.buildFromModel(result);
    }

    async findOneOperation(query: CrudRequest): Promise<OperationDetailsDto> {
        const model = await this.getOne(query);

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
