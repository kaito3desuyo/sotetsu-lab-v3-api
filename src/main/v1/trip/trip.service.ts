import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions, QueryRunner } from 'typeorm';
import { Trip } from './trip.entity';

@Injectable()
export class TripService {
  constructor(
    @InjectRepository(Trip)
    private readonly tripRepository: Repository<Trip>,
  ) {}

  findAll(options?: FindManyOptions): Promise<Trip[]> {
    return this.tripRepository.find(options);
  }

  createQueryBuilder(alias?: string, queryRunner?: QueryRunner) {
    return this.tripRepository.createQueryBuilder(alias, queryRunner);
  }
}
