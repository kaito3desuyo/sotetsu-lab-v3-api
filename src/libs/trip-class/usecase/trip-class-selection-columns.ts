import { columnsOf } from '../../../core/utils/selection/selection-tree.js';

/** `fields[tripClass]` で選べる列（docs/adr/0010-v3-include-and-fields.md） */
export const TRIP_CLASS_COLUMNS = columnsOf(
    'id',
    'serviceId',
    'tripClassName',
    'tripClassColor',
    'sequence',
    'createdAt',
    'updatedAt',
);
