import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/core/modules/auth/auth.guard';
import { RBACGuard } from 'src/core/modules/rbac/rbac.guard';
import { StationDetailsDto } from 'src/libs/station/usecase/dtos/station-details.dto';
import { ServiceAgenciesDto } from '../usecase/dtos/service-agencies.dto';
import { ServiceDetailsDto } from '../usecase/dtos/service-details.dto';
import { ServiceRoutesDto } from '../usecase/dtos/service-routes.dto';
import { ServiceV3Service } from '../usecase/service.v3.service';

@Controller()
@UseGuards(AuthGuard, RBACGuard)
export class ServiceV3Controller {
    constructor(private readonly serviceV3Service: ServiceV3Service) {}

    @Get('/')
    async findMany(
        @Query('serviceName') serviceName?: string,
    ): Promise<ServiceDetailsDto[]> {
        const result = await this.serviceV3Service.findMany({ serviceName });

        return result;
    }

    @Get('/:id/stations')
    async findOneStations(
        @Param('id') serviceId: string,
    ): Promise<StationDetailsDto[]> {
        const result = await this.serviceV3Service.findOneStations({
            serviceId,
        });

        return result;
    }

    @Get('/:id/agencies')
    async findOneServiceWithAgencies(
        @Param('id') serviceId: string,
    ): Promise<ServiceAgenciesDto> {
        const result = await this.serviceV3Service.findOneWithAgencies({
            serviceId,
        });

        return result;
    }

    @Get('/:id/routes')
    async findOneServiceWithRoutes(
        @Param('id') serviceId: string,
    ): Promise<ServiceRoutesDto> {
        const result = await this.serviceV3Service.findOneWithRoutes({
            serviceId,
        });

        return result;
    }
}
