import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../../core/modules/auth/auth.guard.js';
import { CACHE_CONTROL } from '../../../core/modules/cache-control/cache-control.constants.js';
import { CacheControl } from '../../../core/modules/cache-control/cache-control.decorator.js';
import { RBACGuard } from '../../../core/modules/rbac/rbac.guard.js';
import { StationDetailsDto } from '../usecase/dtos/station-details.dto.js';
import { StationV3Service } from '../usecase/station.v3.service.js';

@Controller()
@UseGuards(AuthGuard, RBACGuard)
export class StationV3Controller {
    constructor(private readonly stationV3Service: StationV3Service) {}

    /** `fields` で返す列を選べる（docs/adr/0010-v3-include-and-fields.md） */
    @Get('/')
    @CacheControl(CACHE_CONTROL.MASTER)
    async findAll(
        @Query('include') include?: unknown,
        @Query('fields') fields?: unknown,
    ): Promise<StationDetailsDto[] | Record<string, unknown>[]> {
        const result = await this.stationV3Service.findAll({ include, fields });

        return result;
    }
}
