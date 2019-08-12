import { Controller, Get, Query } from '@nestjs/common';
import { StationService } from './station.service';

@Controller()
export class StationController {
  constructor(private stationService: StationService) {}

  @Get()
  async getStations(): Promise<any> {
    const stations = await this.stationService.findAll();
    return stations;
  }
}
