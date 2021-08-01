import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Agency } from './agency.entity';
import { AgencyService } from './agency.service';
import { Request } from 'express';

@Controller()
@UseGuards(AuthGuard('jwt'))
export class AgencyController {
    constructor(private agencyService: AgencyService) {}

    @Get()
    async getAgencies(
        @Req() req: Request,
    ): Promise<{
        agencies: Agency[];
    }> {
        console.log(req.user);
        const agencies = await this.agencyService.findAll();
        return { agencies };
    }
}
