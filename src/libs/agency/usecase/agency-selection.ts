import { defineSelectionTree } from '../../../core/utils/selection/selection-tree.js';
import { AGENCY_COLUMNS } from './agency-selection-columns.js';

/** `GET /v3/agencies` の `fields` で選べる範囲（docs/adr/0010-v3-include-and-fields.md）。結合が無いので include は受けない */
export const AGENCY_SELECTION_TREE = defineSelectionTree({
    resource: 'agency',
    columns: AGENCY_COLUMNS,
    alwaysKeys: ['id'],
});
