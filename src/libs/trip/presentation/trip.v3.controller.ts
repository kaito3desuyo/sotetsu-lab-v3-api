import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../../core/modules/auth/auth.guard.js';
import { RBACGuard } from '../../../core/modules/rbac/rbac.guard.js';
import { TripDetailsDto } from '../usecase/dtos/trip-details.dto.js';
import { TripFindManyByStationIdQuery } from '../usecase/params/trip-find-many-by-station-id.query.js';
import { TripV3Service } from '../usecase/trip.v3.service.js';
import { TripStationIdParam } from '../usecase/params/trip-station-id.param.js';

@Controller()
@UseGuards(AuthGuard, RBACGuard)
export class TripV3Controller {
    constructor(private readonly tripV3Service: TripV3Service) {}

    /** `include`・`fields` で返す関連・列を選べる（docs/adr/0010-v3-include-and-fields.md） */
    @Get('/station/:stationId')
    async findManyByStationId(
        @Param() param: TripStationIdParam,
        @Query() query: TripFindManyByStationIdQuery,
        @Query('include') include?: unknown,
        @Query('fields') fields?: unknown,
    ): Promise<TripDetailsDto[] | Record<string, unknown>[]> {
        const result = await this.tripV3Service.findManyByStationId({
            stationId: param.stationId,
            calendarId: query.calendarId,
            tripDirection: query.tripDirection,
            include,
            fields,
        });

        return result;
    }
}
