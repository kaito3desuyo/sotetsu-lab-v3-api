import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  FindManyOptions,
  QueryRunner,
  FindOneOptions,
} from 'typeorm';
import { Operation } from './operation.entity';

@Injectable()
export class OperationService {
  constructor(
    @InjectRepository(Operation)
    private readonly operationRepository: Repository<Operation>,
  ) {}

  createQueryBuilder(alias?: string, queryRunner?: QueryRunner) {
    return this.operationRepository.createQueryBuilder(alias, queryRunner);
  }

  findAll(options?: FindManyOptions): Promise<Operation[]> {
    return this.operationRepository.find(options);
  }

  findOne(options?: FindOneOptions): Promise<Operation> {
    return this.operationRepository.findOne(options);
  }
}
