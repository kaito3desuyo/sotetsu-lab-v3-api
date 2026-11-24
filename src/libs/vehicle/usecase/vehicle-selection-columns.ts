import { columnsOf } from '../../../core/utils/selection/selection-tree.js';

/** `fields[vehicle]` で選べる列（docs/adr/0010-v3-include-and-fields.md） */
export const VEHICLE_COLUMNS = columnsOf(
    'id',
    'vehicleNumber',
    'belongs',
    'productionDate',
    'scrappedDate',
    'createdAt',
    'updatedAt',
);

/** `fields[vehicleModification]` で選べる列 */
export const VEHICLE_MODIFICATION_COLUMNS = columnsOf(
    'id',
    'vehicleId',
    'modifiedOn',
    'kind',
    'value',
    'description',
    'createdAt',
    'updatedAt',
);
