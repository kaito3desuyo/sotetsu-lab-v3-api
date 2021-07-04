import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Agency } from './agency.entity';
import { AgencyService } from './agency.service';

@Controller()
@UseGuards(AuthGuard('jwt'))
export class AgencyController {
    constructor(private agencyService: AgencyService) {}

    @Get()
    async getAgencies(): Promise<{
        agencies: Agency[];
    }> {
        const agencies = await this.agencyService.findAll();
        return { agencies };
    }
}
