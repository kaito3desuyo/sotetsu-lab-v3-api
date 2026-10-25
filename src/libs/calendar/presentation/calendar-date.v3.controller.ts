import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Post,
    Query,
    UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../../../core/modules/auth/auth.guard.js';
import { CACHE_CONTROL } from '../../../core/modules/cache-control/cache-control.constants.js';
import { CacheControl } from '../../../core/modules/cache-control/cache-control.decorator.js';
import { RBAC } from '../../../core/modules/rbac/rbac.decorator.js';
import { RBACGuard } from '../../../core/modules/rbac/rbac.guard.js';
import { Role } from '../../../core/modules/rbac/role.enum.js';
import { CalendarDateV3Service } from '../usecase/calendar-date.v3.service.js';
import { CalendarDateDetailsDto } from '../usecase/dtos/calendar-date-details.dto.js';
import { CreateCalendarDateDto } from '../usecase/dtos/create-calendar-date.dto.js';

@Controller()
@UseGuards(AuthGuard, RBACGuard)
export class CalendarDateV3Controller {
    constructor(
        private readonly calendarDateV3Service: CalendarDateV3Service,
    ) {}

    /** `fields` で返す列を選べる（docs/adr/0010-v3-include-and-fields.md） */
    @Get('/')
    @CacheControl(CACHE_CONTROL.MASTER)
    async findMany(
        @Query('calendarId') calendarId?: string,
        @Query('from') from?: string,
        @Query('to') to?: string,
        @Query('include') include?: unknown,
        @Query('fields') fields?: unknown,
    ): Promise<CalendarDateDetailsDto[] | Record<string, unknown>[]> {
        const result = await this.calendarDateV3Service.findMany({
            calendarId,
            from,
            to,
            include,
            fields,
        });

        return result;
    }

    @Post()
    @RBAC(Role.EDITOR, Role.MANAGER)
    async post(
        @Body() body: CreateCalendarDateDto,
    ): Promise<CalendarDateDetailsDto> {
        const result = await this.calendarDateV3Service.create(body);

        return result;
    }

    @Delete('/:id')
    @RBAC(Role.EDITOR, Role.MANAGER)
    @HttpCode(HttpStatus.NO_CONTENT)
    async delete(@Param('id') id: string): Promise<void> {
        await this.calendarDateV3Service.deleteOneById({ id });
    }
}
