import { columnsOf } from '../../../core/utils/selection/selection-tree.js';

/** `fields[service]` で選べる列（docs/adr/0010-v3-include-and-fields.md） */
export const SERVICE_COLUMNS = columnsOf(
    'id',
    'serviceName',
    'serviceDescription',
    'createdAt',
    'updatedAt',
);

/** `fields[operatingSystem]` で選べる列 */
export const OPERATING_SYSTEM_COLUMNS = columnsOf(
    'id',
    'serviceId',
    'routeId',
    'startRouteStationListId',
    'endRouteStationListId',
    'sequence',
);
