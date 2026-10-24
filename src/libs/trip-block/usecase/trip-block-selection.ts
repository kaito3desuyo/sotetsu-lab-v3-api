import {
    columnsOf,
    defineSelectionTree,
} from '../../../core/utils/selection/selection-tree.js';
import { OPERATION_COLUMNS } from '../../operation/usecase/operation-selection-columns.js';
import { TRIP_CLASS_COLUMNS } from '../../trip-class/usecase/trip-class-selection-columns.js';
import {
    TIME_COLUMNS,
    TRIP_COLUMNS,
    TRIP_OPERATION_LIST_COLUMNS,
} from '../../trip/usecase/trip-selection-columns.js';

/**
 * `GET /v3/trip-blocks` の `include`・`fields` で選べる範囲（docs/adr/0010-v3-include-and-fields.md）。
 * trip-block と trip の id は常に返す。列車（trips）は外せない。
 */
export const TRIP_BLOCK_SELECTION_TREE = defineSelectionTree({
    resource: null,
    columns: columnsOf('id'),
    alwaysKeys: ['id'],
    relations: {
        trips: {
            property: 'trips',
            many: true,
            required: true,
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
                    relations: {
                        operation: {
                            property: 'operation',
                            many: false,
                            resource: 'operation',
                            columns: OPERATION_COLUMNS,
                        },
                    },
                },
                tripClass: {
                    property: 'tripClass',
                    many: false,
                    resource: 'tripClass',
                    columns: TRIP_CLASS_COLUMNS,
                },
            },
        },
    },
});
