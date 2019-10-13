import { Controller, Get, UseGuards } from '@nestjs/common';
import { AgencyService } from './agency.service';
import { Agency } from './agency.entity';
import { AuthGuard } from './../../../shared/guards/auth.guard';

@Controller()
@UseGuards(AuthGuard)
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
