import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  FindManyOptions,
  QueryRunner,
  ObjectID,
  FindConditions,
} from 'typeorm';
import { TripOperationList } from './trip_operation_list.entity';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

@Injectable()
export class TripOperationListService {
  constructor(
    @InjectRepository(TripOperationList)
    private readonly tripOperationListRepository: Repository<TripOperationList>,
  ) {}

  findAll(options?: FindManyOptions): Promise<TripOperationList[]> {
    return this.tripOperationListRepository.find(options);
  }

  createQueryBuilder(alias?: string, queryRunner?: QueryRunner) {
    return this.tripOperationListRepository.createQueryBuilder(
      alias,
      queryRunner,
    );
  }

  update(
    criteria:
      | string
      | string[]
      | number
      | number[]
      | Date
      | Date[]
      | ObjectID
      | ObjectID[]
      | FindConditions<TripOperationList>,
    partialEntity: QueryDeepPartialEntity<TripOperationList>,
  ) {
    return this.tripOperationListRepository.update(criteria, partialEntity);
  }
}
