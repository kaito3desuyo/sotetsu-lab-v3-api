import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions } from 'typeorm';
import { Trip } from './trip.entity';

@Injectable()
export class TripService {
  constructor(
    @InjectRepository(Trip)
    private readonly stationRepository: Repository<Trip>,
  ) {}

  findAll(options?: FindManyOptions): Promise<Trip[]> {
    return this.stationRepository.find(options);
  }
}
