import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  FindManyOptions,
  QueryRunner,
  FindOneOptions,
  UpdateManyOptions,
  UpdateResult,
  DeleteResult,
} from 'typeorm';
import { Trip } from './trip.entity';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

@Injectable()
export class TripService {
  constructor(
    @InjectRepository(Trip)
    private readonly tripRepository: Repository<Trip>,
  ) {}

  findAll(options?: FindManyOptions): Promise<Trip[]> {
    return this.tripRepository.find(options);
  }

  findOne(options?: FindOneOptions): Promise<Trip> {
    return this.tripRepository.findOne(options);
  }

  count(options?: FindManyOptions<Trip>) {
    return this.tripRepository.count(options);
  }

  update(
    id: string,
    entity?: QueryDeepPartialEntity<Trip>,
  ): Promise<UpdateResult> {
    return this.tripRepository.update(id, entity);
  }

  delete(id: string): Promise<DeleteResult> {
    return this.tripRepository.delete(id);
  }

  createQueryBuilder(alias?: string, queryRunner?: QueryRunner) {
    return this.tripRepository.createQueryBuilder(alias, queryRunner);
  }
}
