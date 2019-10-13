import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions, QueryRunner } from 'typeorm';
import { Time } from './time.entity';

@Injectable()
export class TimeService {
  constructor(
    @InjectRepository(Time)
    private readonly timeRepository: Repository<Time>,
  ) {}

  findAll(options?: FindManyOptions): Promise<Time[]> {
    return this.timeRepository.find(options);
  }

  createQueryBuilder(alias?: string, queryRunner?: QueryRunner) {
    return this.timeRepository.createQueryBuilder(alias, queryRunner);
  }
}
