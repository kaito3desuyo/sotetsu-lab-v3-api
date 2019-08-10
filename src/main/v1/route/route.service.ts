import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Route } from './route.entity';
import { Repository } from 'typeorm';

@Injectable()
export class RouteService {
  constructor(
    @InjectRepository(Route)
    private readonly routeRepository: Repository<Route>,
  ) {}

  findAll(): Promise<Route[]> {
    return this.routeRepository.find({
      where: [
        {
          route_name: '本線',
        },
      ],
      relations: ['agency', 'route_to_stations', 'route_to_stations.station'],
    });
  }
}
