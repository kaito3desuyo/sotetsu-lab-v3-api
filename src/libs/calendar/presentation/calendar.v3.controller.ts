import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../../core/modules/auth/auth.guard.js';
import { CACHE_CONTROL } from '../../../core/modules/cache-control/cache-control.constants.js';
import { CacheControl } from '../../../core/modules/cache-control/cache-control.decorator.js';
import { RBACGuard } from '../../../core/modules/rbac/rbac.guard.js';
import { CalendarV3Service } from '../usecase/calendar.v3.service.js';
import { CalendarDetailsDto } from '../usecase/dtos/calendar-details.dto.js';

@Controller()
@UseGuards(AuthGuard, RBACGuard)
export class CalendarV3Controller {
    constructor(private readonly calendarV3Service: CalendarV3Service) {}

    /** `fields` で返す列を選べる（docs/adr/0010-v3-include-and-fields.md） */
    @Get('/')
    @CacheControl(CACHE_CONTROL.MASTER)
    async findMany(
        @Query('serviceName') serviceName?: string,
        @Query('include') include?: unknown,
        @Query('fields') fields?: unknown,
    ): Promise<CalendarDetailsDto[] | Record<string, unknown>[]> {
        const result = await this.calendarV3Service.findMany({
            serviceName,
            include,
            fields,
        });

        return result;
    }

    /** `fields` で返す列を選べる（docs/adr/0010-v3-include-and-fields.md） */
    @Get('/as/of/:date')
    @CacheControl(CACHE_CONTROL.MASTER)
    async findOneBySpecificDate(
        @Param('date') date: string,
        @Query('include') include?: unknown,
        @Query('fields') fields?: unknown,
    ): Promise<CalendarDetailsDto | Record<string, unknown> | undefined> {
        const result = await this.calendarV3Service.findOneBySpecificDate({
            date,
            include,
            fields,
        });

        return result;
    }

    /** `fields` で返す列を選べる（docs/adr/0010-v3-include-and-fields.md） */
    @Get('/:id')
    @CacheControl(CACHE_CONTROL.MASTER)
    async findOne(
        @Param('id') id: string,
        @Query('include') include?: unknown,
        @Query('fields') fields?: unknown,
    ): Promise<CalendarDetailsDto | Record<string, unknown> | null> {
        const result = await this.calendarV3Service.findOne({
            id,
            include,
            fields,
        });

        return result;
    }
}
