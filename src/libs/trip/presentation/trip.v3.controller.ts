import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../../core/modules/auth/auth.guard.js';
import { RBACGuard } from '../../../core/modules/rbac/rbac.guard.js';
import { TripDetailsDto } from '../usecase/dtos/trip-details.dto.js';
import { TripFindManyByStationIdQuery } from '../usecase/params/trip-find-many-by-station-id.query.js';
import { TripV3Service } from '../usecase/trip.v3.service.js';

@Controller()
@UseGuards(AuthGuard, RBACGuard)
export class TripV3Controller {
    constructor(private readonly tripV3Service: TripV3Service) {}

    @Get('/station/:stationId')
    async findManyByStationId(
        @Param('stationId') stationId: string,
        @Query() query: TripFindManyByStationIdQuery,
    ): Promise<TripDetailsDto[]> {
        const result = await this.tripV3Service.findManyByStationId({
            stationId,
            calendarId: query.calendarId,
            tripDirection: query.tripDirection,
        });

        return result;
    }
}
