import { columnsOf } from '../../../core/utils/selection/selection-tree.js';

/** `fields[operation]` で選べる列（docs/adr/0010-v3-include-and-fields.md） */
export const OPERATION_COLUMNS = columnsOf(
    'id',
    'calendarId',
    'operationNumber',
    'createdAt',
    'updatedAt',
);
