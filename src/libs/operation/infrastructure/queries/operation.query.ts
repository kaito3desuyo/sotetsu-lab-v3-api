import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CrudRequest, GetManyDefaultResponse } from '@nestjsx/crud';
import { TypeOrmCrudService } from '@nestjsx/crud-typeorm';
import { isArray } from 'lodash';
import { Repository } from 'typeorm';
import { Operation } from '../../../../main/v1/operation/operation.entity';
import { OperationDetailsDto } from '../../usecase/dtos/operation-details.dto';
import { buildOperationDetailsDto } from '../builders/operation-dto.builder';
import { OperationModel } from '../models/operation.model';

@Injectable()
export class OperationQuery extends TypeOrmCrudService<OperationModel> {
    constructor(
        @InjectRepository(Operation)
        private readonly operationRepo: Repository<Operation>,
        @InjectRepository(OperationModel)
        private readonly operationRepository: Repository<OperationModel>,
    ) {
        super(operationRepository);
    }

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

    async findOneOperation(query: CrudRequest): Promise<OperationDetailsDto> {
        const model = await this.getOne(query);

        if (!model) {
            return null;
        }

        return buildOperationDetailsDto(model);
    }

    findByCalendarId(calendarId: string) {
        return this.operationRepo.find({
            where: {
                calendar_id: calendarId,
            },
        });
    }

    async findOperationTripsWithStartTimeAndEndTimeByCalendarId(
        calendarId: string,
    ) {
        const data = await this.operationRepo
            .createQueryBuilder('operation')
            .leftJoinAndSelect(
                'operation.trip_operation_lists',
                'tripOperationList',
            )
            .leftJoinAndSelect('tripOperationList.trip', 'trip')
            .leftJoinAndSelect('tripOperationList.start_time', 'startTime')
            .leftJoinAndSelect('tripOperationList.end_time', 'endTime')
            .andWhere('operation.calendar_id = :calendarId', { calendarId })
            .andWhere('operation.operation_number != :number', {
                number: '100',
            })
            .orderBy('operation.operation_number', 'ASC')
            .addOrderBy('startTime.departure_days', 'ASC')
            .addOrderBy('startTime.departure_time', 'ASC')
            .addOrderBy('endTime.arrival_days', 'ASC')
            .addOrderBy('endTime.arrival_time', 'ASC')
            .getMany();

        return { operations: data };
    }
}
