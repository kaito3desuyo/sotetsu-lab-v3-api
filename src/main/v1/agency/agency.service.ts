import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Agency } from './agency.entity';
import { Repository } from 'typeorm';

@Injectable()
export class AgencyService {
  constructor(
    @InjectRepository(Agency)
    private readonly agencyRepository: Repository<Agency>,
  ) {}

  findAll(): Promise<Agency[]> {
    return this.agencyRepository.find({
      relations: ['routes'],
    });
  }
}
