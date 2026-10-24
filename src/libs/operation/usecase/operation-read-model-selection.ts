import {
    columnsOf,
    defineSelectionTree,
} from '../../../core/utils/selection/selection-tree.js';
import {
    TIME_COLUMNS,
    TRIP_COLUMNS,
    TRIP_OPERATION_LIST_COLUMNS,
} from '../../trip/usecase/trip-selection-columns.js';
import { OPERATION_COLUMNS } from './operation-selection-columns.js';

// 現在位置の前・今・次の区間（列車と始終着の時刻つき）
const segment = <P extends string>(property: P) =>
    ({
        property,
        many: false,
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
    }) as const;

/**
 * `GET /v3/operations/current-positions`・`/:id/current-position` の `fields` で選べる範囲
 * （docs/adr/0010-v3-include-and-fields.md）。read-model なので include は受けない。
 */
export const OPERATION_CURRENT_POSITION_SELECTION_TREE = defineSelectionTree({
    resource: null,
    columns: {},
    relations: {
        operation: {
            property: 'operation',
            many: false,
            resource: 'operation',
            columns: OPERATION_COLUMNS,
            alwaysKeys: ['id'],
        },
        prev: segment('prev'),
        current: segment('current'),
        next: segment('next'),
    },
});

const ITINERARY_LINK_END_COLUMNS = columnsOf(
    'tripOperationListId',
    'tripId',
    'operationId',
    'operationNumber',
    'stationId',
    'rule',
);

/** `GET /v3/operations/itinerary-links` の `fields` で選べる範囲 */
export const OPERATION_ITINERARY_LINK_SELECTION_TREE = defineSelectionTree({
    resource: 'itineraryLink',
    columns: columnsOf('tripOperationListId', 'tripId', 'operationId'),
    alwaysKeys: ['tripOperationListId'],
    relations: {
        previous: {
            property: 'previous',
            many: false,
            resource: 'itineraryLinkEnd',
            columns: ITINERARY_LINK_END_COLUMNS,
            alwaysKeys: ['tripOperationListId'],
        },
        next: {
            property: 'next',
            many: false,
            resource: 'itineraryLinkEnd',
            columns: ITINERARY_LINK_END_COLUMNS,
            alwaysKeys: ['tripOperationListId'],
        },
    },
});

/** `GET /v3/operations/next-operation-candidates` の `fields` で選べる範囲 */
export const NEXT_SEGMENT_CANDIDATE_SELECTION_TREE = defineSelectionTree({
    resource: 'nextSegmentCandidate',
    columns: columnsOf(
        'tripOperationListId',
        'tripId',
        'operationId',
        'operationNumber',
        'startStationId',
        'startSeconds',
        'isTaken',
        'isFixedByTripBlock',
    ),
    alwaysKeys: ['tripOperationListId'],
});
