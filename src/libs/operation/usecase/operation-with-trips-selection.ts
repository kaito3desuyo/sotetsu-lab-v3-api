import { defineSelectionTree } from '../../../core/utils/selection/selection-tree.js';
import { CALENDAR_COLUMNS } from '../../calendar/usecase/calendar-selection-columns.js';
import { TRIP_CLASS_COLUMNS } from '../../trip-class/usecase/trip-class-selection-columns.js';
import {
    TIME_COLUMNS,
    TRIP_COLUMNS,
    TRIP_OPERATION_LIST_COLUMNS,
} from '../../trip/usecase/trip-selection-columns.js';
import { OPERATION_COLUMNS } from './operation-selection-columns.js';

/**
 * `GET /v3/operations/calendar/:calendarId/trips` の `include`・`fields` で選べる範囲
 * （docs/adr/0010-v3-include-and-fields.md）。`trips` は運用の区間（tripOperationLists）。
 */
export const OPERATION_WITH_TRIPS_SELECTION_TREE = defineSelectionTree({
    resource: null,
    columns: {},
    relations: {
        operation: {
            property: 'operation',
            many: false,
            required: true,
            resource: 'operation',
            // 全部入りの応答と同じく、id を operationId でも返せる
            columns: { ...OPERATION_COLUMNS, operationId: 'id' },
            alwaysKeys: ['id'],
            relations: {
                calendar: {
                    property: 'calendar',
                    many: false,
                    resource: 'calendar',
                    columns: CALENDAR_COLUMNS,
                    alwaysKeys: ['id'],
                },
            },
        },
        trips: {
            property: 'trips',
            many: true,
            resource: 'tripOperationList',
            columns: TRIP_OPERATION_LIST_COLUMNS,
            alwaysKeys: ['id'],
            relations: {
                trip: {
                    property: 'trip',
                    many: false,
                    resource: 'trip',
                    columns: TRIP_COLUMNS,
                    alwaysKeys: ['id'],
                    relations: {
                        tripClass: {
                            property: 'tripClass',
                            many: false,
                            resource: 'tripClass',
                            columns: TRIP_CLASS_COLUMNS,
                            alwaysKeys: ['id'],
                        },
                    },
                },
                startTime: {
                    property: 'startTime',
                    many: false,
                    resource: 'time',
                    columns: TIME_COLUMNS,
                    alwaysKeys: ['id'],
                },
                endTime: {
                    property: 'endTime',
                    many: false,
                    resource: 'time',
                    columns: TIME_COLUMNS,
                    alwaysKeys: ['id'],
                },
            },
        },
    },
});
