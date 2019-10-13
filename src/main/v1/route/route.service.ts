import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Route } from './route.entity';
import { Repository, FindManyOptions } from 'typeorm';

@Injectable()
export class RouteService {
  constructor(
    @InjectRepository(Route)
    private readonly routeRepository: Repository<Route>,
  ) {}

  findAll(options?: FindManyOptions): Promise<Route[]> {
    return this.routeRepository.find(options);
  }
}
