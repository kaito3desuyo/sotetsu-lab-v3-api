import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/core/modules/auth/auth.guard';
import { RBACGuard } from 'src/core/modules/rbac/rbac.guard';
import { RouteV3Service } from '../usecase/route.v3.service';
import { RouteStationsDto } from '../usecase/dtos/route-stations.dto';

@Controller()
@UseGuards(AuthGuard, RBACGuard)
export class RouteV3Controller {
    constructor(private readonly routeV3Service: RouteV3Service) {}

    @Get('/:id/stations')
    async findOneWithStations(
        @Param('id') routeId: string,
    ): Promise<RouteStationsDto> {
        return this.routeV3Service.findOneWithStations({ routeId });
    }
}
