import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Route } from './route.entity';
import { RouteService } from './route.service';

@Controller()
@UseGuards(AuthGuard('jwt'))
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
            relations: ['route_station_lists', 'route_station_lists.station'],
        });
        return routes;
    }
}
