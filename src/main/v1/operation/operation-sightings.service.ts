import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Operation } from './operation.entity';
import { OperationSighting } from './operation-sighting.entity';

@Injectable()
export class OperationSightingService {
  constructor(
    @InjectRepository(OperationSighting)
    private readonly operationSightingRepository: Repository<OperationSighting>,
  ) {}

  findAll(): Promise<OperationSighting[]> {
    return this.operationSightingRepository.find({
      relations: ['operation', 'operation.calender'],
    });
  }
}
