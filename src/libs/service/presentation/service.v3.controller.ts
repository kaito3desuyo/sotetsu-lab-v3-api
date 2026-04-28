import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/core/modules/auth/auth.guard';
import { RBACGuard } from 'src/core/modules/rbac/rbac.guard';
import { ServiceAgenciesDto } from '../usecase/dtos/service-agencies.dto';
import { ServiceRoutesDto } from '../usecase/dtos/service-routes.dto';
import { ServiceV3Service } from '../usecase/service.v3.service';

@Controller()
@UseGuards(AuthGuard, RBACGuard)
export class ServiceV3Controller {
    constructor(private readonly serviceV3Service: ServiceV3Service) {}

    @Get('/:id/agencies')
    async findOneServiceWithAgencies(
        @Param('id') serviceId: string,
    ): Promise<ServiceAgenciesDto> {
        return this.serviceV3Service.findOneWithAgencies({ serviceId });
    }

    @Get('/:id/routes')
    async findOneServiceWithRoutes(
        @Param('id') serviceId: string,
    ): Promise<ServiceRoutesDto> {
        return this.serviceV3Service.findOneWithRoutes({ serviceId });
    }
}
