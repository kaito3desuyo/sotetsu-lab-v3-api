import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../../core/modules/auth/auth.guard.js';
import { CACHE_CONTROL } from '../../../core/modules/cache-control/cache-control.constants.js';
import { CacheControl } from '../../../core/modules/cache-control/cache-control.decorator.js';
import { RBACGuard } from '../../../core/modules/rbac/rbac.guard.js';
import { parseCommaList } from '../../../core/utils/comma-list.js';
import { NextSegmentCandidateDto } from '../usecase/dtos/next-segment-candidate.dto.js';
import { OperationItineraryLinkDto } from '../usecase/dtos/operation-itinerary-link.dto.js';
import { OperationCurrentPositionDto } from '../usecase/dtos/operation-current-position.dto.js';
import { OperationDetailsDto } from '../usecase/dtos/operation-details.dto.js';
import { OperationGroupDto } from '../usecase/dtos/operation-group.dto.js';
import { OperationWithTripsDto } from '../usecase/dtos/operation-with-trips.dto.js';
import { NextOperationCandidatesQuery } from '../usecase/params/next-operation-candidates.query.js';
import { OperationCalendarQuery } from '../usecase/params/operation-calendar.query.js';
import { OperationV3Service } from '../usecase/operation.v3.service.js';

@Controller()
@UseGuards(AuthGuard, RBACGuard)
export class OperationV3Controller {
    constructor(private readonly operationV3Service: OperationV3Service) {}

    @Get('/groups')
    @CacheControl(CACHE_CONTROL.MASTER)
    findAllGroups(): OperationGroupDto[] {
        return this.operationV3Service.findAllGroups();
    }

    /** `fields` で返す列を選べる（docs/adr/0010-v3-include-and-fields.md） */
    @Get('/calendar/:calendarId')
    @CacheControl(CACHE_CONTROL.TIMETABLE)
    async findManyByCalendarId(
        @Param('calendarId') calendarId: string,
        @Query('include') include?: unknown,
        @Query('fields') fields?: unknown,
    ): Promise<OperationDetailsDto[] | Record<string, unknown>[]> {
        const result = await this.operationV3Service.findManyByCalendarId({
            calendarId,
            include,
            fields,
        });

        return result;
    }

    /**
     * ダイヤ内の全運用を列車つきで返す（運用表用。運用ごとの /:id/trips を束ねる）。
     * `include`・`fields` で返す関連・列を選べる（docs/adr/0010-v3-include-and-fields.md）
     */
    @Get('/calendar/:calendarId/trips')
    @CacheControl(CACHE_CONTROL.TIMETABLE)
    async findManyWithTrips(
        @Param('calendarId') calendarId: string,
        @Query('include') include?: unknown,
        @Query('fields') fields?: unknown,
    ): Promise<OperationWithTripsDto[] | Record<string, unknown>[]> {
        const result = await this.operationV3Service.findManyWithTrips({
            calendarId,
            include,
            fields,
        });

        return result;
    }

    /**
     * 運番が変わる車両のつながり（運用表・行路図の前後の運用用）。`?calendarId=` 必須。
     * `fields` で返す項目を選べる（include は受けない。docs/adr/0010-v3-include-and-fields.md）
     */
    @Get('/itinerary-links')
    @CacheControl(CACHE_CONTROL.TIMETABLE)
    findManyItineraryLinks(
        @Query() query: OperationCalendarQuery,
        @Query('include') include?: unknown,
        @Query('fields') fields?: unknown,
    ): Promise<OperationItineraryLinkDto[] | Record<string, unknown>[]> {
        return this.operationV3Service.findManyItineraryLinks({
            calendarId: query.calendarId,
            include,
            fields,
        });
    }

    /**
     * 「次の運用」の候補。`stationId` で始まり、`afterSeconds`（鉄道日の 0 時からの秒）以降の区間。
     * `fields` で返す項目を選べる（include は受けない。docs/adr/0010-v3-include-and-fields.md）
     */
    @Get('/next-operation-candidates')
    @CacheControl(CACHE_CONTROL.TIMETABLE)
    async findManyNextSegmentCandidates(
        @Query() query: NextOperationCandidatesQuery,
        @Query('include') include?: unknown,
        @Query('fields') fields?: unknown,
    ): Promise<NextSegmentCandidateDto[] | Record<string, unknown>[]> {
        return this.operationV3Service.findManyNextSegmentCandidates({
            calendarId: query.calendarId,
            stationId: query.stationId,
            afterSeconds: Number(query.afterSeconds) || 0,
            include,
            fields,
        });
    }

    /**
     * 複数の運用の現在位置をまとめて返す（リアルタイム運用情報用。運用ごとの
     * /:id/current-position を束ねる）。`operationIds=a,b,c`。
     * `fields` で返す項目を選べる（include は受けない。docs/adr/0010-v3-include-and-fields.md）
     */
    @Get('/current-positions')
    @CacheControl(CACHE_CONTROL.REALTIME)
    async findManyWithCurrentPosition(
        @Query('operationIds') operationIds: string,
        @Query('searchTime') searchTime?: string,
        @Query('include') include?: unknown,
        @Query('fields') fields?: unknown,
    ): Promise<OperationCurrentPositionDto[] | Record<string, unknown>[]> {
        const result =
            await this.operationV3Service.findManyWithCurrentPosition({
                operationIds: parseCommaList(operationIds),
                searchTime,
                include,
                fields,
            });

        return result;
    }

    /** `include`・`fields` で返す関連・列を選べる（docs/adr/0010-v3-include-and-fields.md） */
    @Get('/from/:start/to/:end')
    @CacheControl(CACHE_CONTROL.TIMETABLE)
    async findManyBySpecificPeriod(
        @Param('start') start: string,
        @Param('end') end: string,
        @Query('include') include?: unknown,
        @Query('fields') fields?: unknown,
    ): Promise<OperationDetailsDto[] | Record<string, unknown>[]> {
        const result = await this.operationV3Service.findManyBySpecificPeriod({
            start,
            end,
            include,
            fields,
        });

        return result;
    }

    /** `include`・`fields` で返す関連・列を選べる（docs/adr/0010-v3-include-and-fields.md） */
    @Get('/:id/trips')
    @CacheControl(CACHE_CONTROL.TIMETABLE)
    async findOneWithTrips(
        @Param('id') operationId: string,
        @Query('include') include?: unknown,
        @Query('fields') fields?: unknown,
    ): Promise<OperationWithTripsDto | Record<string, unknown> | null> {
        const result = await this.operationV3Service.findOneWithTrips({
            operationId,
            include,
            fields,
        });

        return result;
    }

    /** `fields` で返す項目を選べる（include は受けない。docs/adr/0010-v3-include-and-fields.md） */
    @Get('/:id/current-position')
    @CacheControl(CACHE_CONTROL.REALTIME)
    async findOneWithCurrentPosition(
        @Param('id') operationId: string,
        @Query('searchTime') searchTime?: string,
        @Query('include') include?: unknown,
        @Query('fields') fields?: unknown,
    ): Promise<OperationCurrentPositionDto | Record<string, unknown> | null> {
        const result = await this.operationV3Service.findOneWithCurrentPosition(
            {
                operationId,
                searchTime,
                include,
                fields,
            },
        );

        return result;
    }
}
