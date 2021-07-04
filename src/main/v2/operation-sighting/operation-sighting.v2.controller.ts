import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { OperationSightingService } from '../../../libs/operation-sighting/application-service/operation-sighting.service';

@Controller()
@UseGuards(AuthGuard('jwt'))
export class OperationSightingV2Controller {
    constructor(private operationSightingService: OperationSightingService) {}

    @Get('/latest')
    getLatestOperationSightings(@Query('calendar_id') calendarId: string) {
        return this.operationSightingService.findLatestBySightingTime(
            calendarId,
        );
    }
}
