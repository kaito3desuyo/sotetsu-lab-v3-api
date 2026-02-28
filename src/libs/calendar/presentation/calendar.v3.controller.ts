import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/core/modules/auth/auth.guard';
import { RBACGuard } from 'src/core/modules/rbac/rbac.guard';
import { CalendarV3Service } from '../usecase/calendar.v3.service';
import { CalendarDetailsDto } from '../usecase/dtos/calendar-details.dto';

@Controller()
@UseGuards(AuthGuard, RBACGuard)
export class CalendarV3Controller {
    constructor(private readonly calendarV3Service: CalendarV3Service) {}

    @Get('/as/of/:date')
    async findOneBySpecificDate(
        @Param('date') date: string,
    ): Promise<CalendarDetailsDto> {
        const result = await this.calendarV3Service.findOneBySpecificDate({
            date,
        });

        return result;
    }
}
