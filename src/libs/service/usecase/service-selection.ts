import { defineSelectionTree } from '../../../core/utils/selection/selection-tree.js';
import { SERVICE_COLUMNS } from './service-selection-columns.js';

/** `GET /v3/services` の `fields` で選べる範囲（docs/adr/0010-v3-include-and-fields.md）。結合が無いので include は受けない */
export const SERVICE_SELECTION_TREE = defineSelectionTree({
    resource: 'service',
    columns: SERVICE_COLUMNS,
    alwaysKeys: ['id'],
});
