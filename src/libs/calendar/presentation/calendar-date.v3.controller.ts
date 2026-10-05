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
import { AuthGuard } from 'src/core/modules/auth/auth.guard';
import { RBAC } from 'src/core/modules/rbac/rbac.decorator';
import { RBACGuard } from 'src/core/modules/rbac/rbac.guard';
import { Role } from 'src/core/modules/rbac/role.enum';
import { CalendarDateV3Service } from '../usecase/calendar-date.v3.service';
import { CalendarDateDetailsDto } from '../usecase/dtos/calendar-date-details.dto';
import { CreateCalendarDateDto } from '../usecase/dtos/create-calendar-date.dto';

@Controller()
@UseGuards(AuthGuard, RBACGuard)
export class CalendarDateV3Controller {
    constructor(
        private readonly calendarDateV3Service: CalendarDateV3Service,
    ) {}

    @Get('/')
    async findMany(
        @Query('calendarId') calendarId?: string,
        @Query('from') from?: string,
        @Query('to') to?: string,
    ): Promise<CalendarDateDetailsDto[]> {
        const result = await this.calendarDateV3Service.findMany({
            calendarId,
            from,
            to,
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
