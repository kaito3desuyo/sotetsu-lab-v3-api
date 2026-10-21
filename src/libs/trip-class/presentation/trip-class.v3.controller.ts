import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../../core/modules/auth/auth.guard.js';
import { CACHE_CONTROL } from '../../../core/modules/cache-control/cache-control.constants.js';
import { CacheControl } from '../../../core/modules/cache-control/cache-control.decorator.js';
import { RBACGuard } from '../../../core/modules/rbac/rbac.guard.js';
import { TripClassDetailsDto } from '../usecase/dtos/trip-class-details.dto.js';
import { TripClassV3Service } from '../usecase/trip-class.v3.service.js';

@Controller()
@UseGuards(AuthGuard, RBACGuard)
export class TripClassV3Controller {
    constructor(private readonly tripClassV3Service: TripClassV3Service) {}

    @Get()
    @CacheControl(CACHE_CONTROL.MASTER)
    async findMany(
        @Query('serviceId') serviceId?: string,
    ): Promise<TripClassDetailsDto[]> {
        return this.tripClassV3Service.findMany({ serviceId });
    }
}
