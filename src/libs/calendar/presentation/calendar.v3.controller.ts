import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/core/modules/auth/auth.guard';
import { CACHE_CONTROL } from 'src/core/modules/cache-control/cache-control.constants';
import { CacheControl } from 'src/core/modules/cache-control/cache-control.decorator';
import { RBACGuard } from 'src/core/modules/rbac/rbac.guard';
import { CalendarV3Service } from '../usecase/calendar.v3.service';
import { CalendarDetailsDto } from '../usecase/dtos/calendar-details.dto';

@Controller()
@UseGuards(AuthGuard, RBACGuard)
export class CalendarV3Controller {
    constructor(private readonly calendarV3Service: CalendarV3Service) {}

    @Get('/')
    @CacheControl(CACHE_CONTROL.MASTER)
    async findMany(
        @Query('serviceName') serviceName?: string,
    ): Promise<CalendarDetailsDto[]> {
        const result = await this.calendarV3Service.findMany({ serviceName });

        return result;
    }

    @Get('/as/of/:date')
    @CacheControl(CACHE_CONTROL.MASTER)
    async findOneBySpecificDate(
        @Param('date') date: string,
    ): Promise<CalendarDetailsDto> {
        const result = await this.calendarV3Service.findOneBySpecificDate({
            date,
        });

        return result;
    }

    @Get('/:id')
    @CacheControl(CACHE_CONTROL.MASTER)
    async findOne(@Param('id') id: string): Promise<CalendarDetailsDto> {
        const result = await this.calendarV3Service.findOne({ id });

        return result;
    }
}
