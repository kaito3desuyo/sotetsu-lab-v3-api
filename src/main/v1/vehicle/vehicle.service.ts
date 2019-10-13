import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Vehicle } from './vehicle.entity';
import { Repository, FindManyOptions, QueryRunner } from 'typeorm';

@Injectable()
export class VehicleService {
  constructor(
    @InjectRepository(Vehicle)
    private readonly vehicleRepository: Repository<Vehicle>,
  ) {}

  query(query: string, parameters?: any[]) {
    return this.vehicleRepository.query(query, parameters);
  }

  createQueryBuilder(alias?: string, queryRunner?: QueryRunner) {
    return this.vehicleRepository.createQueryBuilder(alias, queryRunner);
  }

  findAll(options?: FindManyOptions): Promise<Vehicle[]> {
    return this.vehicleRepository.find(options);
  }
}
