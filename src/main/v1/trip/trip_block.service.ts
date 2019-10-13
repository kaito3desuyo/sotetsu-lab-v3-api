import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TripBlock } from './trip_block.entity';
import {
  Repository,
  FindManyOptions,
  QueryRunner,
  DeepPartial,
  SaveOptions,
  FindOneOptions,
} from 'typeorm';
import { isArray } from 'lodash';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

@Injectable()
export class TripBlockService {
  constructor(
    @InjectRepository(TripBlock)
    private readonly tripBlockRepository: Repository<TripBlock>,
  ) {}

  findAll(options?: FindManyOptions): Promise<TripBlock[]> {
    return this.tripBlockRepository.find(options);
  }

  findOne(options?: FindOneOptions): Promise<TripBlock> {
    return this.tripBlockRepository.findOne(options);
  }

  createQueryBuilder(alias?: string, queryRunner?: QueryRunner) {
    return this.tripBlockRepository.createQueryBuilder(alias, queryRunner);
  }

  insert(
    entity:
      | QueryDeepPartialEntity<TripBlock>
      | Array<QueryDeepPartialEntity<TripBlock>>,
  ) {
    return this.tripBlockRepository.insert(entity);
  }

  save(
    entity: DeepPartial<TripBlock> | Array<DeepPartial<TripBlock>>,
    options?: SaveOptions & { reload: false },
  ) {
    if (!isArray(entity)) {
      return this.tripBlockRepository.save(entity, options);
    } else {
      return this.tripBlockRepository.save(entity, options);
    }
  }

  delete(id: string) {
    return this.tripBlockRepository.delete(id);
  }
}
