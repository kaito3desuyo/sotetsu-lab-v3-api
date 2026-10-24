import { defineSelectionTree } from '../../../core/utils/selection/selection-tree.js';
import { CALENDAR_COLUMNS } from '../../calendar/usecase/calendar-selection-columns.js';
import { OPERATION_COLUMNS } from './operation-selection-columns.js';

/** `GET /v3/operations/from/:start/to/:end` の `include`・`fields` で選べる範囲（docs/adr/0010-v3-include-and-fields.md） */
export const OPERATIONS_BY_PERIOD_SELECTION_TREE = defineSelectionTree({
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
});
