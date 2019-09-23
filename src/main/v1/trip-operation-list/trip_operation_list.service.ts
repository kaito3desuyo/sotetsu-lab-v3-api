import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions, QueryRunner } from 'typeorm';
import { TripOperationList } from './trip_operation_list.entity';

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
}
