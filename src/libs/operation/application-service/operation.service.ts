import { Injectable } from '@nestjs/common';
import { OperationQuery } from '../infrastructure/query/operation.query';

@Injectable()
export class OperationService {
    constructor(private operationQuery: OperationQuery) {}

    findByCalendarId(calendarId: string) {
        return this.operationQuery.findByCalendarId(calendarId);
    }

    findOperationTripsWithStartTimeAndEndTimeByCalendarId(calendarId: string) {
        return this.operationQuery.findOperationTripsWithStartTimeAndEndTimeByCalendarId(
            calendarId,
        );
    }
}
