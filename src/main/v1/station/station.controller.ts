import { Controller, Get, Query } from '@nestjs/common';
import { StationService } from './station.service';
import { Station } from './station.entity';

@Controller()
export class StationController {
  constructor(private stationService: StationService) {}

  @Get()
  async getStations(): Promise<{ stations: Station[] }> {
    const stations = await this.stationService.findAll();
    return { stations };
  }
}