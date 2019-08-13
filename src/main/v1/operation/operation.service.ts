import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions } from 'typeorm';
import { Operation } from './operation.entity';

@Injectable()
export class OperationService {
  constructor(
    @InjectRepository(Operation)
    private readonly operationRepository: Repository<Operation>,
  ) {}

  findAll(options?: FindManyOptions): Promise<Operation[]> {
    return this.operationRepository.find(options);
  }
}
