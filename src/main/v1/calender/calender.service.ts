import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  MoreThan,
  FindManyOptions,
  QueryRunner,
  FindOneOptions,
} from 'typeorm';
import { Calender } from './calender.entity';

@Injectable()
export class CalenderService {
  constructor(
    @InjectRepository(Calender)
    private readonly calenderRepository: Repository<Calender>,
  ) {}

  query(query: string, parameters?: any[]) {
    return this.calenderRepository.query(query, parameters);
  }

  createQueryBuilder(alias?: string, queryRunner?: QueryRunner) {
    return this.calenderRepository.createQueryBuilder(alias, queryRunner);
  }

  findAll(options?: FindManyOptions): Promise<Calender[]> {
    return this.calenderRepository.find(options);
  }

  findOne(options?: FindOneOptions): Promise<Calender> {
    return this.calenderRepository.findOne(options);
  }
}
