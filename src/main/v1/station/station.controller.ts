import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { StationService } from './station.service';
import { Station } from './station.entity';
import { AuthGuard } from './../../../shared/guards/auth.guard';

@Controller()
@UseGuards(AuthGuard)
export class StationController {
  constructor(private stationService: StationService) {}

  @Get()
  async getStations(): Promise<{ stations: Station[] }> {
    const stations = await this.stationService.findAll();
    return { stations };
  }
}
