import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/core/modules/auth/auth.guard';
import { CACHE_CONTROL } from 'src/core/modules/cache-control/cache-control.constants';
import { CacheControl } from 'src/core/modules/cache-control/cache-control.decorator';
import { RBACGuard } from 'src/core/modules/rbac/rbac.guard';
import { StationDetailsDto } from '../usecase/dtos/station-details.dto';
import { StationV3Service } from '../usecase/station.v3.service';

@Controller()
@UseGuards(AuthGuard, RBACGuard)
export class StationV3Controller {
    constructor(private readonly stationV3Service: StationV3Service) {}

    @Get('/')
    @CacheControl(CACHE_CONTROL.MASTER)
    async findAll(): Promise<StationDetailsDto[]> {
        const result = await this.stationV3Service.findAll();

        return result;
    }
}
