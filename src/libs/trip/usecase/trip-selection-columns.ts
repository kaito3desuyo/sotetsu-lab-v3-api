import { columnsOf } from '../../../core/utils/selection/selection-tree.js';

/** `fields[trip]` で選べる列。id は alwaysKeys で常に返すので載せない（docs/adr/0010-v3-include-and-fields.md） */
export const TRIP_COLUMNS = columnsOf(
    'serviceId',
    'tripNumber',
    'tripClassId',
    'tripName',
    'tripDirection',
    'tripBlockId',
    'depotIn',
    'depotOut',
    'calendarId',
    'extraCalendarId',
    'createdAt',
    'updatedAt',
);

/** `fields[time]` で選べる列 */
export const TIME_COLUMNS = columnsOf(
    'id',
    'tripId',
    'stationId',
    'stopId',
    'stopSequence',
    'pickupType',
    'dropoffType',
    'arrivalDays',
    'arrivalTime',
    'departureDays',
    'departureTime',
    'createdAt',
    'updatedAt',
);

/** `fields[tripOperationList]` で選べる列 */
export const TRIP_OPERATION_LIST_COLUMNS = columnsOf(
    'id',
    'tripId',
    'operationId',
    'startStationId',
    'endStationId',
    'startTimeId',
    'endTimeId',
    'nextTripOperationListId',
    'createdAt',
    'updatedAt',
);
