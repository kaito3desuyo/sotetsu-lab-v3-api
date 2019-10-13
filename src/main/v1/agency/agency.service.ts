import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Agency } from './agency.entity';
import { Repository, FindManyOptions } from 'typeorm';

@Injectable()
export class AgencyService {
  constructor(
    @InjectRepository(Agency)
    private readonly agencyRepository: Repository<Agency>,
  ) {}

  findAll(options?: FindManyOptions): Promise<Agency[]> {
    return this.agencyRepository.find(options);
  }
}
