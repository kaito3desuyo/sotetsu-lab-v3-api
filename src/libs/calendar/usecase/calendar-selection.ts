import { defineSelectionTree } from '../../../core/utils/selection/selection-tree.js';
import {
    CALENDAR_COLUMNS,
    CALENDAR_DATE_COLUMNS,
} from './calendar-selection-columns.js';

/**
 * `GET /v3/calendars`・`/as/of/:date`・`/:id` の `fields` で選べる範囲
 * （docs/adr/0010-v3-include-and-fields.md）。結合が無いので include は受けない。
 */
export const CALENDAR_SELECTION_TREE = defineSelectionTree({
    resource: 'calendar',
    columns: CALENDAR_COLUMNS,
    alwaysKeys: ['id'],
});

/** `GET /v3/calendar-dates` の `fields` で選べる範囲 */
export const CALENDAR_DATE_SELECTION_TREE = defineSelectionTree({
    resource: 'calendarDate',
    columns: CALENDAR_DATE_COLUMNS,
    alwaysKeys: ['id'],
});
