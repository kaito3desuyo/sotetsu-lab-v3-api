import { Controller, Get, Query, UseGuards, Param } from '@nestjs/common';
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

  @Get('/:id')
  async getStationById(@Param('id') id: string): Promise<{ station: Station }> {
    const station = await this.stationService.findOne({ where: { id } });
    return { station };
  }
}
