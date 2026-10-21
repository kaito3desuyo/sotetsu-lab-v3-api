import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../../core/modules/auth/auth.guard.js';
import { CACHE_CONTROL } from '../../../core/modules/cache-control/cache-control.constants.js';
import { CacheControl } from '../../../core/modules/cache-control/cache-control.decorator.js';
import { RBACGuard } from '../../../core/modules/rbac/rbac.guard.js';
import { AgencyDetailsDto } from '../usecase/dtos/agency-details.dto.js';
import { AgencyV3Service } from '../usecase/agency.v3.service.js';

@Controller()
@UseGuards(AuthGuard, RBACGuard)
export class AgencyV3Controller {
    constructor(private readonly agencyV3Service: AgencyV3Service) {}

    @Get('/')
    @CacheControl(CACHE_CONTROL.MASTER)
    async findAll(): Promise<AgencyDetailsDto[]> {
        const result = await this.agencyV3Service.findAll();

        return result;
    }
}
