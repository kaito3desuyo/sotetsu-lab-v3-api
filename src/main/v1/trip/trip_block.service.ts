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
}
