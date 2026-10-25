import { defineSelectionTree } from '../../../core/utils/selection/selection-tree.js';
import { STATION_COLUMNS } from './station-selection-columns.js';

/** `GET /v3/stations` の `fields` で選べる範囲（docs/adr/0010-v3-include-and-fields.md）。結合が無いので include は受けない */
export const STATION_SELECTION_TREE = defineSelectionTree({
    resource: 'station',
    columns: STATION_COLUMNS,
    alwaysKeys: ['id'],
});
