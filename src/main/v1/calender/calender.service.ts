import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Calender } from './calender.entity';

@Injectable()
export class CalenderService {
  constructor(
    @InjectRepository(Calender)
    private readonly calenderRepository: Repository<Calender>,
  ) {}

  findAll(): Promise<Calender[]> {
    return this.calenderRepository.find({
      relations: [],
      where: [
        {
          start_date: MoreThan('2018-01-01'),
        },
      ],
    });
  }
}
