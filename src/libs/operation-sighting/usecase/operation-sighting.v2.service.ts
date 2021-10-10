import { Injectable } from '@nestjs/common';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { OperationSightingQuery } from '../infrastructure/query/operation-sighting.query';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault('Asia/Tokyo');

@Injectable()
export class OperationSightingV2Service {
    constructor(
        private readonly operationSightingQuery: OperationSightingQuery,
    ) {}
}
