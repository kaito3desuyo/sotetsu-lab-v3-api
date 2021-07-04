import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Station } from './station.entity';
import { StationService } from './station.service';

@Controller()
@UseGuards(AuthGuard('jwt'))
export class StationController {
    constructor(private stationService: StationService) {}

    @Get()
    async getStations(): Promise<{ stations: Station[] }> {
        const stations = await this.stationService.findAll();
        return { stations };
    }

    @Get('/:id')
    async getStationById(
        @Param('id') id: string,
    ): Promise<{ station: Station }> {
        const station = await this.stationService.findOne({ where: { id } });
        return { station };
    }
}
