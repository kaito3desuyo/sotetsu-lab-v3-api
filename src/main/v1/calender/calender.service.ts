import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, FindManyOptions } from 'typeorm';
import { Calender } from './calender.entity';

@Injectable()
export class CalenderService {
  constructor(
    @InjectRepository(Calender)
    private readonly calenderRepository: Repository<Calender>,
  ) {}

  findAll(options?: FindManyOptions): Promise<Calender[]> {
    return this.calenderRepository.find(options);
  }
}
