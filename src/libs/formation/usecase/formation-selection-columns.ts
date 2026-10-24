import { columnsOf } from '../../../core/utils/selection/selection-tree.js';

/** `fields[formation]` で選べる列（docs/adr/0010-v3-include-and-fields.md）。formationId の別名は木ごとに足す */
export const FORMATION_COLUMNS = columnsOf(
    'id',
    'agencyId',
    'vehicleType',
    'formationNumber',
    'formationDescription',
    'startDate',
    'endDate',
    'createdAt',
    'updatedAt',
);

/** `fields[vehicleFormation]` で選べる列 */
export const VEHICLE_FORMATION_COLUMNS = columnsOf(
    'id',
    'formationId',
    'vehicleId',
    'carNumber',
    'createdAt',
    'updatedAt',
);
