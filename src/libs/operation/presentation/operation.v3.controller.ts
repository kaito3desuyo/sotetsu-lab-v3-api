import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/core/modules/auth/auth.guard';
import { CACHE_CONTROL } from 'src/core/modules/cache-control/cache-control.constants';
import { CacheControl } from 'src/core/modules/cache-control/cache-control.decorator';
import { RBACGuard } from 'src/core/modules/rbac/rbac.guard';
import { parseCommaList } from 'src/core/utils/comma-list';
import { OperationCurrentPositionDto } from '../usecase/dtos/operation-current-position.dto';
import { OperationDetailsDto } from '../usecase/dtos/operation-details.dto';
import { OperationGroupDto } from '../usecase/dtos/operation-group.dto';
import { OperationWithTripsDto } from '../usecase/dtos/operation-with-trips.dto';
import { OperationV3Service } from '../usecase/operation.v3.service';

@Controller()
@UseGuards(AuthGuard, RBACGuard)
export class OperationV3Controller {
    constructor(private readonly operationV3Service: OperationV3Service) {}

    @Get('/groups')
    @CacheControl(CACHE_CONTROL.MASTER)
    findAllGroups(): OperationGroupDto[] {
        return this.operationV3Service.findAllGroups();
    }

    @Get('/calendar/:calendarId')
    @CacheControl(CACHE_CONTROL.TIMETABLE)
    async findManyByCalendarId(
        @Param('calendarId') calendarId: string,
    ): Promise<OperationDetailsDto[]> {
        const result = await this.operationV3Service.findManyByCalendarId({
            calendarId,
        });

        return result;
    }

    /** ダイヤ内の全運用を列車つきで返す（運用表用。運用ごとの /:id/trips を束ねる） */
    @Get('/calendar/:calendarId/trips')
    @CacheControl(CACHE_CONTROL.TIMETABLE)
    async findManyWithTrips(
        @Param('calendarId') calendarId: string,
    ): Promise<OperationWithTripsDto[]> {
        const result = await this.operationV3Service.findManyWithTrips({
            calendarId,
        });

        return result;
    }

    /**
     * 複数の運用の現在位置をまとめて返す（リアルタイム運用情報用。運用ごとの
     * /:id/current-position を束ねる）。`operationIds=a,b,c`
     */
    @Get('/current-positions')
    @CacheControl(CACHE_CONTROL.REALTIME)
    async findManyWithCurrentPosition(
        @Query('operationIds') operationIds: string,
        @Query('searchTime') searchTime?: string,
    ): Promise<OperationCurrentPositionDto[]> {
        const result =
            await this.operationV3Service.findManyWithCurrentPosition({
                operationIds: parseCommaList(operationIds),
                searchTime,
            });

        return result;
    }

    @Get('/from/:start/to/:end')
    @CacheControl(CACHE_CONTROL.TIMETABLE)
    async findManyBySpecificPeriod(
        @Param('start') start: string,
        @Param('end') end: string,
    ): Promise<OperationDetailsDto[]> {
        const result = await this.operationV3Service.findManyBySpecificPeriod({
            start,
            end,
        });

        return result;
    }

    @Get('/:id/trips')
    @CacheControl(CACHE_CONTROL.TIMETABLE)
    async findOneWithTrips(
        @Param('id') operationId: string,
    ): Promise<OperationWithTripsDto> {
        const result = await this.operationV3Service.findOneWithTrips({
            operationId,
        });

        return result;
    }

    @Get('/:id/current-position')
    @CacheControl(CACHE_CONTROL.REALTIME)
    async findOneWithCurrentPosition(
        @Param('id') operationId: string,
        @Query('searchTime') searchTime?: string,
    ): Promise<OperationCurrentPositionDto> {
        const result = await this.operationV3Service.findOneWithCurrentPosition(
            {
                operationId,
                searchTime,
            },
        );

        return result;
    }
}
