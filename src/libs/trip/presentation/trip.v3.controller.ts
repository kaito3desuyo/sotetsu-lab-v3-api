import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/core/modules/auth/auth.guard';
import { RBACGuard } from 'src/core/modules/rbac/rbac.guard';
import { TripDetailsDto } from '../usecase/dtos/trip-details.dto';
import { TripFindManyByStationIdQuery } from '../usecase/params/trip-find-many-by-station-id.query';
import { TripV3Service } from '../usecase/trip.v3.service';

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
