import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/core/modules/auth/auth.guard';
import { RBACGuard } from 'src/core/modules/rbac/rbac.guard';
import { AgencyDetailsDto } from '../usecase/dtos/agency-details.dto';
import { AgencyV3Service } from '../usecase/agency.v3.service';

@Controller()
@UseGuards(AuthGuard, RBACGuard)
export class AgencyV3Controller {
    constructor(private readonly agencyV3Service: AgencyV3Service) {}

    @Get('/')
    async findAll(): Promise<AgencyDetailsDto[]> {
        const result = await this.agencyV3Service.findAll();

        return result;
    }
}
