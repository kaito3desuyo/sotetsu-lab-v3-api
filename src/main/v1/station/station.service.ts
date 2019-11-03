import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOneOptions } from 'typeorm';
import { Station } from './station.entity';

@Injectable()
export class StationService {
  constructor(
    @InjectRepository(Station)
    private readonly stationRepository: Repository<Station>,
  ) {}

  findAll(options?: { relations?: string[] }): Promise<Station[]> {
    return this.stationRepository.find(options);
  }

  findOne(options?: FindOneOptions): Promise<Station> {
    return this.stationRepository.findOne(options);
  }
}
