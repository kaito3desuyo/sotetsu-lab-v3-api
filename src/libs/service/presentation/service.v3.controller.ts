import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../../core/modules/auth/auth.guard.js';
import { CACHE_CONTROL } from '../../../core/modules/cache-control/cache-control.constants.js';
import { CacheControl } from '../../../core/modules/cache-control/cache-control.decorator.js';
import { RBACGuard } from '../../../core/modules/rbac/rbac.guard.js';
import { ServiceAgenciesDto } from '../usecase/dtos/service-agencies.dto.js';
import { ServiceDetailsDto } from '../usecase/dtos/service-details.dto.js';
import { ServiceRoutesDto } from '../usecase/dtos/service-routes.dto.js';
import { ServiceStationsDto } from '../usecase/dtos/service-stations.dto.js';
import { ServiceV3Service } from '../usecase/service.v3.service.js';

@Controller()
@UseGuards(AuthGuard, RBACGuard)
export class ServiceV3Controller {
    constructor(private readonly serviceV3Service: ServiceV3Service) {}

    @Get('/')
    @CacheControl(CACHE_CONTROL.MASTER)
    async findMany(
        @Query('serviceName') serviceName?: string,
    ): Promise<ServiceDetailsDto[]> {
        const result = await this.serviceV3Service.findMany({ serviceName });

        return result;
    }

    /** `include`・`fields` で返す関連・列を選べる（docs/adr/0010-v3-include-and-fields.md） */
    @Get('/:id/stations')
    @CacheControl(CACHE_CONTROL.MASTER)
    async findOneStations(
        @Param('id') serviceId: string,
        @Query('include') include?: unknown,
        @Query('fields') fields?: unknown,
    ): Promise<ServiceStationsDto | Record<string, unknown>> {
        const result = await this.serviceV3Service.findOneStations({
            serviceId,
            include,
            fields,
        });

        return result;
    }

    @Get('/:id/agencies')
    @CacheControl(CACHE_CONTROL.MASTER)
    async findOneServiceWithAgencies(
        @Param('id') serviceId: string,
    ): Promise<ServiceAgenciesDto> {
        const result = await this.serviceV3Service.findOneWithAgencies({
            serviceId,
        });

        return result;
    }

    @Get('/:id/routes')
    @CacheControl(CACHE_CONTROL.MASTER)
    async findOneServiceWithRoutes(
        @Param('id') serviceId: string,
    ): Promise<ServiceRoutesDto> {
        const result = await this.serviceV3Service.findOneWithRoutes({
            serviceId,
        });

        return result;
    }
}
