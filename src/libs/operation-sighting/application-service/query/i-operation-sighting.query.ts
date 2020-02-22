import { Moment } from 'moment';

export interface IOperationSightingQuery {
    findLatestBySightingTimeGroupByOperation(time: Moment): Promise<any>;
}
