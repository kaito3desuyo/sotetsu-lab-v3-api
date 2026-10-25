import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../../core/modules/auth/auth.guard.js';
import { CACHE_CONTROL } from '../../../core/modules/cache-control/cache-control.constants.js';
import { CacheControl } from '../../../core/modules/cache-control/cache-control.decorator.js';
import { RBACGuard } from '../../../core/modules/rbac/rbac.guard.js';
import { RouteDetailsDto } from '../usecase/dtos/route-details.dto.js';
import { RouteStationsDto } from '../usecase/dtos/route-stations.dto.js';
import { RouteV3Service } from '../usecase/route.v3.service.js';

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

    /** `include`・`fields` で返す関連・列を選べる（docs/adr/0010-v3-include-and-fields.md） */
    @Get('/:id/stations')
    @CacheControl(CACHE_CONTROL.MASTER)
    async findOneWithStations(
        @Param('id') routeId: string,
        @Query('include') include?: unknown,
        @Query('fields') fields?: unknown,
    ): Promise<RouteStationsDto | Record<string, unknown>> {
        const result = await this.routeV3Service.findOneWithStations({
            routeId,
            include,
            fields,
        });

        return result;
    }
}
