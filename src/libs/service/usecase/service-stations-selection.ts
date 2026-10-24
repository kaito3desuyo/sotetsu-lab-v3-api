import { defineSelectionTree } from '../../../core/utils/selection/selection-tree.js';
import {
    ROUTE_COLUMNS,
    ROUTE_STATION_LIST_COLUMNS,
} from '../../route/usecase/route-selection-columns.js';
import {
    STATION_COLUMNS,
    STOP_COLUMNS,
} from '../../station/usecase/station-selection-columns.js';
import {
    OPERATING_SYSTEM_COLUMNS,
    SERVICE_COLUMNS,
} from './service-selection-columns.js';

const routeStationList = (property: string) =>
    ({
        property,
        many: false,
        resource: 'routeStationList',
        columns: ROUTE_STATION_LIST_COLUMNS,
        alwaysKeys: ['id'],
    }) as const;

/**
 * `GET /v3/services/:id/stations` の `include`・`fields` で選べる範囲
 * （docs/adr/0010-v3-include-and-fields.md）。駅（stations）は外せない。
 * service の下の駅には関連を付けない（駅の路線・のりばは stations の側で取る）。
 */
export const SERVICE_STATIONS_SELECTION_TREE = defineSelectionTree({
    resource: null,
    columns: {},
    relations: {
        service: {
            property: 'service',
            many: false,
            resource: 'service',
            columns: SERVICE_COLUMNS,
            alwaysKeys: ['id'],
            relations: {
                operatingSystems: {
                    property: 'operatingSystems',
                    many: true,
                    resource: 'operatingSystem',
                    columns: OPERATING_SYSTEM_COLUMNS,
                    alwaysKeys: ['id'],
                    relations: {
                        route: {
                            property: 'route',
                            many: false,
                            resource: 'route',
                            columns: ROUTE_COLUMNS,
                            alwaysKeys: ['id'],
                            relations: {
                                routeStationLists: {
                                    property: 'routeStationLists',
                                    many: true,
                                    resource: 'routeStationList',
                                    columns: ROUTE_STATION_LIST_COLUMNS,
                                    alwaysKeys: ['id'],
                                    relations: {
                                        station: {
                                            property: 'station',
                                            many: false,
                                            resource: 'station',
                                            columns: STATION_COLUMNS,
                                            alwaysKeys: ['id'],
                                        },
                                    },
                                },
                            },
                        },
                        startRouteStationList: routeStationList(
                            'startRouteStationList',
                        ),
                        endRouteStationList: routeStationList(
                            'endRouteStationList',
                        ),
                    },
                },
            },
        },
        stations: {
            property: 'stations',
            many: true,
            required: true,
            resource: 'station',
            columns: STATION_COLUMNS,
            alwaysKeys: ['id'],
            relations: {
                routeStationLists: {
                    property: 'routeStationLists',
                    many: true,
                    resource: 'routeStationList',
                    columns: ROUTE_STATION_LIST_COLUMNS,
                    alwaysKeys: ['id'],
                    relations: {
                        route: {
                            property: 'route',
                            many: false,
                            resource: 'route',
                            columns: ROUTE_COLUMNS,
                            alwaysKeys: ['id'],
                        },
                    },
                },
                stops: {
                    property: 'stops',
                    many: true,
                    resource: 'stop',
                    columns: STOP_COLUMNS,
                    alwaysKeys: ['id'],
                },
            },
        },
    },
});
