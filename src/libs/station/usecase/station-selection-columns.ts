import { columnsOf } from '../../../core/utils/selection/selection-tree.js';

/** `fields[station]` で選べる列（docs/adr/0010-v3-include-and-fields.md） */
export const STATION_COLUMNS = columnsOf(
    'id',
    'stationName',
    'stationSubname',
    'stationType',
    'stationDescription',
    'stationLatlng',
    'stationUrl',
    'wheelchairBoarding',
    'createdAt',
    'updatedAt',
);

/** `fields[stop]` で選べる列 */
export const STOP_COLUMNS = columnsOf(
    'id',
    'stationId',
    'stopName',
    'stopDescription',
    'stopLatlng',
    'zoneId',
    'createdAt',
    'updatedAt',
);
