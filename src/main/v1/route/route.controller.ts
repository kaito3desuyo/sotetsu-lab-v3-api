import { Controller, Get } from '@nestjs/common';
import { RouteService } from './route.service';
import { Route } from './route.entity';

@Controller()
export class RouteController {
  constructor(private routeService: RouteService) {}

  @Get()
  async getRoutes(): Promise<Route[]> {
    const routes = await this.routeService.findAll();
    return routes;
  }

  @Get('/all/stations')
  async getRoutesAllStations(): Promise<Route[]> {
    const routes = await this.routeService.findAll({
      relations: ['route_to_stations', 'route_to_stations.station'],
    });
    return routes;
  }
}
