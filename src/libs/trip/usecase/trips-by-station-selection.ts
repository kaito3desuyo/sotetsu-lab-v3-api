import { defineSelectionTree } from '../../../core/utils/selection/selection-tree.js';
import {
    TIME_COLUMNS,
    TRIP_COLUMNS,
    TRIP_OPERATION_LIST_COLUMNS,
} from './trip-selection-columns.js';

/**
 * `GET /v3/trips/station/:stationId` の `include`・`fields` で選べる範囲
 * （docs/adr/0010-v3-include-and-fields.md）。列車の id は常に返す。
 */
export const TRIPS_BY_STATION_SELECTION_TREE = defineSelectionTree({
    resource: 'trip',
    columns: TRIP_COLUMNS,
    alwaysKeys: ['id'],
    relations: {
        times: {
            property: 'times',
            many: true,
            resource: 'time',
            columns: TIME_COLUMNS,
        },
        tripOperationLists: {
            property: 'tripOperationLists',
            many: true,
            resource: 'tripOperationList',
            columns: TRIP_OPERATION_LIST_COLUMNS,
        },
    },
});
