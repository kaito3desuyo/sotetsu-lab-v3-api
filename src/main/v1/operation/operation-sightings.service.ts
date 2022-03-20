import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
    Repository,
    MoreThan,
    FindManyOptions,
    QueryRunner,
    DeepPartial,
} from 'typeorm';
import { OperationSighting } from './operation-sighting.entity';
import moment = require('moment');

@Injectable()
export class OperationSightingService {
    constructor(
        @InjectRepository(OperationSighting)
        private readonly operationSightingRepository: Repository<OperationSighting>,
    ) {}

    createQueryBuilder(alias?: string, queryRunner?: QueryRunner) {
        return this.operationSightingRepository.createQueryBuilder(
            alias,
            queryRunner,
        );
    }

    findAll(options?: FindManyOptions): Promise<OperationSighting[]> {
        return this.operationSightingRepository.find(options);
    }

    async save(value: DeepPartial<OperationSighting>) {
        const data = this.operationSightingRepository.create({
            ...value,
            // updated_at: moment().toISOString(),
        });
        const response = await this.operationSightingRepository.save(data);
        return response;
    }
}
