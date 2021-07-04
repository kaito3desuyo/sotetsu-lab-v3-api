import {
    Controller,
    Get,
    Query,
    UnprocessableEntityException,
    UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { OperationService } from 'src/libs/operation/application-service/operation.service';

@Controller()
@UseGuards(AuthGuard('jwt'))
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
