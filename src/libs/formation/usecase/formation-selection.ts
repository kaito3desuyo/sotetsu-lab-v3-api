import { defineSelectionTree } from '../../../core/utils/selection/selection-tree.js';
import { AGENCY_COLUMNS } from '../../agency/usecase/agency-selection-columns.js';
import {
    VEHICLE_COLUMNS,
    VEHICLE_MODIFICATION_COLUMNS,
} from '../../vehicle/usecase/vehicle-selection-columns.js';
import {
    FORMATION_COLUMNS,
    VEHICLE_FORMATION_COLUMNS,
} from './formation-selection-columns.js';

// 全部入りの応答と同じく、id を formationId でも返せる
const FORMATION_ROOT = {
    resource: 'formation',
    columns: { ...FORMATION_COLUMNS, formationId: 'id' },
    alwaysKeys: ['id'],
} as const;

// 号車・車両・改造の記録（docs/adr/0020-vehicle-modifications.md）。as/of と from/to で同じ形を使う
const VEHICLE_FORMATIONS_RELATION = {
    property: 'vehicleFormations',
    many: true,
    resource: 'vehicleFormation',
    columns: VEHICLE_FORMATION_COLUMNS,
    alwaysKeys: ['id'],
    relations: {
        vehicle: {
            property: 'vehicle',
            many: false,
            resource: 'vehicle',
            columns: VEHICLE_COLUMNS,
            alwaysKeys: ['id'],
            relations: {
                modifications: {
                    property: 'modifications',
                    many: true,
                    resource: 'vehicleModification',
                    columns: VEHICLE_MODIFICATION_COLUMNS,
                    alwaysKeys: ['id'],
                },
            },
        },
    },
} as const;

/** `GET /v3/formations/as/of/:date` の `include`・`fields` で選べる範囲（docs/adr/0010-v3-include-and-fields.md） */
export const FORMATIONS_AS_OF_SELECTION_TREE = defineSelectionTree({
    ...FORMATION_ROOT,
    relations: {
        vehicleFormations: VEHICLE_FORMATIONS_RELATION,
    },
});

/** `GET /v3/formations/from/:startDate/to/:endDate` の `include`・`fields` で選べる範囲 */
export const FORMATIONS_BY_PERIOD_SELECTION_TREE = defineSelectionTree({
    ...FORMATION_ROOT,
    relations: {
        agency: {
            property: 'agency',
            many: false,
            resource: 'agency',
            columns: AGENCY_COLUMNS,
            alwaysKeys: ['id'],
        },
        vehicleFormations: VEHICLE_FORMATIONS_RELATION,
    },
});
