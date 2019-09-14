import { Controller, Get } from '@nestjs/common';
import { AgencyService } from './agency.service';
import { Agency } from './agency.entity';

@Controller()
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
