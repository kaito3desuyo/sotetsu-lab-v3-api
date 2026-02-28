import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/core/modules/auth/auth.guard';
import { RBACGuard } from 'src/core/modules/rbac/rbac.guard';
import { ServiceV3Service } from '../usecase/service.v3.service';
import { ServiceRoutesDto } from '../usecase/dtos/service-routes.dto';

@Controller()
@UseGuards(AuthGuard, RBACGuard)
export class ServiceV3Controller {
    constructor(private readonly serviceV3Service: ServiceV3Service) {}

    @Get('/:id/routes')
    async findOneServiceWithRoutes(
        @Param('id') serviceId: string,
    ): Promise<ServiceRoutesDto> {
        return this.serviceV3Service.findOneWithRoutes({ serviceId });
    }
}
