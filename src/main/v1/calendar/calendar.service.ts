import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  MoreThan,
  FindManyOptions,
  QueryRunner,
  FindOneOptions,
} from 'typeorm';
import { Calendar } from './calendar.entity';

@Injectable()
export class CalendarService {
  constructor(
    @InjectRepository(Calendar)
    private readonly calendarRepository: Repository<Calendar>,
  ) {}

  query(query: string, parameters?: any[]) {
    return this.calendarRepository.query(query, parameters);
  }

  createQueryBuilder(alias?: string, queryRunner?: QueryRunner) {
    return this.calendarRepository.createQueryBuilder(alias, queryRunner);
  }

  findAll(options?: FindManyOptions): Promise<Calendar[]> {
    return this.calendarRepository.find(options);
  }

  findOne(options?: FindOneOptions): Promise<Calendar> {
    return this.calendarRepository.findOne(options);
  }
}
