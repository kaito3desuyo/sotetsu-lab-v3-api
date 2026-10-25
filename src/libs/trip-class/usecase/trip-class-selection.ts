import { defineSelectionTree } from '../../../core/utils/selection/selection-tree.js';
import { TRIP_CLASS_COLUMNS } from './trip-class-selection-columns.js';

/** `GET /v3/trip-classes` の `fields` で選べる範囲（docs/adr/0010-v3-include-and-fields.md）。結合が無いので include は受けない */
export const TRIP_CLASS_SELECTION_TREE = defineSelectionTree({
    resource: 'tripClass',
    columns: TRIP_CLASS_COLUMNS,
    alwaysKeys: ['id'],
});
