import {
    FieldsetRequires,
    FieldsetWhitelist,
} from 'src/core/utils/sparse-fieldsets';

/**
 * `GET /v3/trip-blocks` の `fields` で選べる項目（docs/adr/0002-v3-sparse-fieldsets.md）。
 * 名前は応答の項目名（= モデルのプロパティ名）。trip-block と trip の id は常に返すので載せない。
 */
export const TRIP_BLOCK_FIELDSET_WHITELIST = {
    trip: [
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
    ],
    time: [
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
    ],
    tripOperationList: [
        'id',
        'tripId',
        'operationId',
        'startStationId',
        'endStationId',
        'startTimeId',
        'endTimeId',
        'createdAt',
        'updatedAt',
    ],
    operation: [
        'id',
        'calendarId',
        'operationNumber',
        'createdAt',
        'updatedAt',
    ],
    tripClass: [
        'id',
        'serviceId',
        'tripClassName',
        'tripClassColor',
        'sequence',
        'createdAt',
        'updatedAt',
    ],
} as const satisfies FieldsetWhitelist;

/** 子の資源 → 結合に要る親の資源 */
export const TRIP_BLOCK_FIELDSET_REQUIRES = {
    operation: 'tripOperationList',
} as const satisfies FieldsetRequires;
