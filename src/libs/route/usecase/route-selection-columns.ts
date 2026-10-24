import { columnsOf } from '../../../core/utils/selection/selection-tree.js';

/** `fields[route]` で選べる列（docs/adr/0010-v3-include-and-fields.md） */
export const ROUTE_COLUMNS = columnsOf(
    'id',
    'agencyId',
    'routeNumber',
    'routeName',
    'routeDescription',
    'routeType',
    'routeUrl',
    'routeColor',
    'routeTextColor',
    'createdAt',
    'updatedAt',
);

/** `fields[routeStationList]` で選べる列 */
export const ROUTE_STATION_LIST_COLUMNS = columnsOf(
    'id',
    'routeId',
    'stationId',
    'stationSequence',
    'stationNumbering',
);
