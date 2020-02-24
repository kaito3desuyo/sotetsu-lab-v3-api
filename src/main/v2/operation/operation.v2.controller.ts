import {
    Controller,
    Get,
    UseGuards,
    Query,
    UnprocessableEntityException,
} from '@nestjs/common';
import { AuthGuard } from 'src/shared/guards/auth.guard';
import { OperationService } from 'src/libs/operation/application-service/operation.service';

@Controller()
@UseGuards(AuthGuard)
export class OperationV2Controller {
    constructor(private readonly operationService: OperationService) {}

    @Get()
    test() {
        return 'hoge';
    }

    @Get('/trips')
    getOperationsTrips(@Query('calendar_id') calendarId: string) {
        if (!calendarId) {
            throw new UnprocessableEntityException(
                'Please set `calendar_id` query.',
            );
        }
        return this.operationService.findOperationTripsWithStartTimeAndEndTimeByCalendarId(
            calendarId,
        );
    }
}
