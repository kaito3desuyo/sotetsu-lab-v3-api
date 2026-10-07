import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/core/modules/auth/auth.guard';
import { CACHE_CONTROL } from 'src/core/modules/cache-control/cache-control.constants';
import { CacheControl } from 'src/core/modules/cache-control/cache-control.decorator';
import { RBACGuard } from 'src/core/modules/rbac/rbac.guard';
import { RouteDetailsDto } from '../usecase/dtos/route-details.dto';
import { RouteStationsDto } from '../usecase/dtos/route-stations.dto';
import { RouteV3Service } from '../usecase/route.v3.service';

@Controller()
@UseGuards(AuthGuard, RBACGuard)
export class RouteV3Controller {
    constructor(private readonly routeV3Service: RouteV3Service) {}

    @Get('/')
    @CacheControl(CACHE_CONTROL.MASTER)
    async findMany(
        @Query('serviceName') serviceName?: string,
    ): Promise<RouteDetailsDto[]> {
        const result = await this.routeV3Service.findMany({ serviceName });

        return result;
    }

    @Get('/:id/stations')
    @CacheControl(CACHE_CONTROL.MASTER)
    async findOneWithStations(
        @Param('id') routeId: string,
    ): Promise<RouteStationsDto> {
        const result = await this.routeV3Service.findOneWithStations({
            routeId,
        });

        return result;
    }
}
