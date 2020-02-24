/* eslint-disable @typescript-eslint/camelcase */
import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Operation } from '../../../../main/v1/operation/operation.entity';

@Injectable()
export class OperationQuery {
    constructor(
        @InjectRepository(Operation)
        private readonly operationRepo: Repository<Operation>,
    ) {}

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
