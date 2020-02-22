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
}
