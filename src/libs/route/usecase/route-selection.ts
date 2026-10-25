import {
    columnsOf,
    defineSelectionTree,
} from '../../../core/utils/selection/selection-tree.js';
import { STATION_COLUMNS } from '../../station/usecase/station-selection-columns.js';
import { ROUTE_COLUMNS } from './route-selection-columns.js';

/**
 * `GET /v3/routes/:id/stations` の `include`・`fields` で選べる範囲
 * （docs/adr/0010-v3-include-and-fields.md）。作った応答を削る。駅（stations）は外せない。
 * 駅には路線の駅の並びと駅番号が足されているので、`fields[station]` でも選べる。
 */
export const ROUTE_STATIONS_SELECTION_TREE = defineSelectionTree({
    resource: null,
    columns: {},
    relations: {
        route: {
            property: 'route',
            many: false,
            resource: 'route',
            columns: ROUTE_COLUMNS,
            alwaysKeys: ['id'],
        },
        stations: {
            property: 'stations',
            many: true,
            required: true,
            resource: 'station',
            columns: {
                ...STATION_COLUMNS,
                ...columnsOf('stationSequence', 'stationNumbering'),
            },
            alwaysKeys: ['id'],
        },
    },
});
