import { defineSelectionTree } from '../../../core/utils/selection/selection-tree.js';
import { FORMATION_COLUMNS } from '../../formation/usecase/formation-selection-columns.js';
import { OPERATION_COLUMNS } from '../../operation/usecase/operation-selection-columns.js';
import {
    OPERATION_SIGHTING_COLUMNS,
    OPERATION_SIGHTING_INVALIDATION_COLUMNS,
    SIGHTED_AS_OPERATION_COLUMNS,
} from './operation-sighting-selection-columns.js';

const operation = {
    property: 'operation',
    many: false,
    resource: 'operation',
    columns: { ...OPERATION_COLUMNS, operationId: 'operationId' },
    alwaysKeys: ['id'],
} as const;

const formation = {
    property: 'formation',
    many: false,
    resource: 'formation',
    columns: { ...FORMATION_COLUMNS, formationId: 'formationId' },
    alwaysKeys: ['id'],
} as const;

const sightedAsOperation = {
    property: 'sightedAsOperation',
    many: false,
    resource: 'sightedAsOperation',
    columns: SIGHTED_AS_OPERATION_COLUMNS,
    alwaysKeys: ['operationId', 'operationNumber'],
} as const;

/**
 * 時刻断面の 4 本（`time-cross-section/*`）の `fields` で選べる範囲（docs/adr/0010-v3-include-and-fields.md）。
 * read-model なので include は受けない。作った DTO を削るので、別名は DTO の同じ名前の項目を指す。
 */
export const OPERATION_SIGHTING_TIME_CROSS_SECTION_SELECTION_TREE =
    defineSelectionTree({
        resource: null,
        columns: {},
        relations: {
            latestSighting: {
                property: 'latestSighting',
                many: false,
                resource: 'operationSighting',
                columns: OPERATION_SIGHTING_COLUMNS,
                alwaysKeys: ['id'],
                relations: {
                    operation,
                    formation,
                    invalidation: {
                        property: 'invalidation',
                        many: false,
                        resource: 'operationSightingInvalidation',
                        columns: OPERATION_SIGHTING_INVALIDATION_COLUMNS,
                        alwaysKeys: ['operationSightingInvalidationId'],
                    },
                    sightedAsOperation,
                },
            },
            expectedSighting: {
                property: 'expectedSighting',
                many: false,
                resource: 'operationSighting',
                columns: OPERATION_SIGHTING_COLUMNS,
                alwaysKeys: ['id'],
                relations: { operation, formation },
            },
            sightedAsOperation,
        },
    });
