import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Service } from './service.entity';
import { Repository, FindManyOptions } from 'typeorm';

@Injectable()
export class ServiceService {
  constructor(
    @InjectRepository(Service)
    private readonly serviceRepository: Repository<Service>,
  ) {}

  findAll(options?: FindManyOptions): Promise<Service[]> {
    return this.serviceRepository.find(options);
  }
}
