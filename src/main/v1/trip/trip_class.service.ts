import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TripClass } from './trip_class.entity';
import { Repository, FindManyOptions, QueryRunner } from 'typeorm';

@Injectable()
export class TripClassService {
  constructor(
    @InjectRepository(TripClass)
    private readonly tripClassRepository: Repository<TripClass>,
  ) {}

  findAll(options?: FindManyOptions): Promise<TripClass[]> {
    return this.tripClassRepository.find(options);
  }

  createQueryBuilder(alias?: string, queryRunner?: QueryRunner) {
    return this.tripClassRepository.createQueryBuilder(alias, queryRunner);
  }
}
