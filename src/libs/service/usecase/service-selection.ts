import {
    columnsOf,
    defineSelectionTree,
} from '../../../core/utils/selection/selection-tree.js';
import { AGENCY_COLUMNS } from '../../agency/usecase/agency-selection-columns.js';
import { ROUTE_COLUMNS } from '../../route/usecase/route-selection-columns.js';
import { SERVICE_COLUMNS } from './service-selection-columns.js';

/** `GET /v3/services` の `fields` で選べる範囲（docs/adr/0010-v3-include-and-fields.md）。結合が無いので include は受けない */
export const SERVICE_SELECTION_TREE = defineSelectionTree({
    resource: 'service',
    columns: SERVICE_COLUMNS,
    alwaysKeys: ['id'],
});

const SERVICE_RELATION = {
    property: 'service',
    many: false,
    resource: 'service',
    columns: SERVICE_COLUMNS,
    alwaysKeys: ['id'],
} as const;

/** `GET /v3/services/:id/agencies` の `include`・`fields` で選べる範囲。作った応答を削る。事業者（agencies）は外せない */
export const SERVICE_AGENCIES_SELECTION_TREE = defineSelectionTree({
    resource: null,
    columns: {},
    relations: {
        service: SERVICE_RELATION,
        agencies: {
            property: 'agencies',
            many: true,
            required: true,
            resource: 'agency',
            columns: AGENCY_COLUMNS,
            alwaysKeys: ['id'],
        },
    },
});

/**
 * `GET /v3/services/:id/routes` の `include`・`fields` で選べる範囲。作った応答を削る。路線（routes）は外せない。
 * 路線には運行系統の並びと始終点が足されているので、`fields[route]` でも選べる。
 */
export const SERVICE_ROUTES_SELECTION_TREE = defineSelectionTree({
    resource: null,
    columns: {},
    relations: {
        service: SERVICE_RELATION,
        routes: {
            property: 'routes',
            many: true,
            required: true,
            resource: 'route',
            columns: {
                ...ROUTE_COLUMNS,
                ...columnsOf(
                    'sequence',
                    'startRouteStationListId',
                    'endRouteStationListId',
                ),
            },
            alwaysKeys: ['id'],
        },
    },
});
