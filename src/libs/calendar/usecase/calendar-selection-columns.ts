import { columnsOf } from '../../../core/utils/selection/selection-tree.js';

/** `fields[calendar]` で選べる列（docs/adr/0010-v3-include-and-fields.md） */
export const CALENDAR_COLUMNS = columnsOf(
    'id',
    'serviceId',
    'calendarName',
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'startDate',
    'endDate',
    'createdAt',
    'updatedAt',
);
