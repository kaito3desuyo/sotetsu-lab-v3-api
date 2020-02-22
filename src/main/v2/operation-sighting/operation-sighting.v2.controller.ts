import { Controller, Get, Query } from '@nestjs/common';
import { OperationSightingService } from '../../../libs/operation-sighting/application-service/operation-sighting.service';

@Controller()
export class OperationSightingV2Controller {
    constructor(private operationSightingService: OperationSightingService) {}

    @Get('/latest')
    getLatestOperationSightings(@Query('calendar_id') calendarId: string) {
        return this.operationSightingService.findLatestBySightingTime(
            calendarId,
        );
    }
}
