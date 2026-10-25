import { defineSelectionTree } from '../../../core/utils/selection/selection-tree.js';
import { OPERATION_COLUMNS } from './operation-selection-columns.js';

/**
 * `GET /v3/operations/calendar/:calendarId` の `fields` で選べる範囲
 * （docs/adr/0010-v3-include-and-fields.md）。結合が無いので include は受けない。
 * 作った DTO を削るので、operationId は DTO の同じ名前の項目を指す。
 */
export const OPERATIONS_BY_CALENDAR_SELECTION_TREE = defineSelectionTree({
    resource: 'operation',
    columns: { ...OPERATION_COLUMNS, operationId: 'operationId' },
    alwaysKeys: ['id'],
});
