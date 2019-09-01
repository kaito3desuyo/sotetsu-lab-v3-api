import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TripBlock } from './trip_block.entity';
import { Repository, FindManyOptions, QueryRunner } from 'typeorm';

@Injectable()
export class TripBlockService {
  constructor(
    @InjectRepository(TripBlock)
    private readonly tripBlockRepository: Repository<TripBlock>,
  ) {}

  findAll(options?: FindManyOptions): Promise<TripBlock[]> {
    return this.tripBlockRepository.find(options);
  }

  createQueryBuilder(alias?: string, queryRunner?: QueryRunner) {
    return this.tripBlockRepository.createQueryBuilder(alias, queryRunner);
  }
}
