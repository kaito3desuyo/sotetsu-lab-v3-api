import { defineSelectionTree } from '../../../core/utils/selection/selection-tree.js';
import { FORMATION_COLUMNS } from '../../formation/usecase/formation-selection-columns.js';
import { OPERATION_COLUMNS } from '../../operation/usecase/operation-selection-columns.js';
import {
    OPERATION_SIGHTING_COLUMNS,
    OPERATION_SIGHTING_INVALIDATION_COLUMNS,
    OPERATION_SIGHTING_MANAGEMENT_LOG_COLUMNS,
    SIGHTED_AS_OPERATION_COLUMNS,
} from './operation-sighting-selection-columns.js';

/**
 * `GET /v3/operation-sightings/from/:start/to/:end` の `include`・`fields` で選べる範囲
 * （docs/adr/0010-v3-include-and-fields.md）。作った DTO を削るので、別名は DTO の同じ名前の項目を指す。
 * `operation`・`formation`・`sightedAsOperation` は引き継いだ目撃にだけある。
 */
export const OPERATION_SIGHTINGS_BY_PERIOD_SELECTION_TREE = defineSelectionTree(
    {
        resource: 'operationSighting',
        columns: OPERATION_SIGHTING_COLUMNS,
        alwaysKeys: ['id'],
        relations: {
            operation: {
                property: 'operation',
                many: false,
                resource: 'operation',
                columns: { ...OPERATION_COLUMNS, operationId: 'operationId' },
                alwaysKeys: ['id'],
            },
            formation: {
                property: 'formation',
                many: false,
                resource: 'formation',
                columns: { ...FORMATION_COLUMNS, formationId: 'formationId' },
                alwaysKeys: ['id'],
            },
            // 無効化の印なので外せない（fields だけのときは ID だけを返す）
            invalidation: {
                property: 'invalidation',
                many: false,
                required: true,
                resource: 'operationSightingInvalidation',
                columns: OPERATION_SIGHTING_INVALIDATION_COLUMNS,
                alwaysKeys: ['operationSightingInvalidationId'],
            },
            managementLogs: {
                property: 'managementLogs',
                many: true,
                resource: 'operationSightingManagementLog',
                columns: OPERATION_SIGHTING_MANAGEMENT_LOG_COLUMNS,
                alwaysKeys: ['operationSightingManagementLogId'],
            },
            // 引き継いだ目撃の印なので外せない。fields だけのときも全項目を返すよう、全項目を alwaysKeys にする
            sightedAsOperation: {
                property: 'sightedAsOperation',
                many: false,
                required: true,
                resource: 'sightedAsOperation',
                columns: SIGHTED_AS_OPERATION_COLUMNS,
                alwaysKeys: ['operationId', 'operationNumber'],
            },
        },
    },
);
