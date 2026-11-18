import { columnsOf } from '../../../core/utils/selection/selection-tree.js';

/** `fields[operationSighting]` で選べる列（docs/adr/0010-v3-include-and-fields.md） */
export const OPERATION_SIGHTING_COLUMNS = columnsOf(
    'id',
    'operationSightingId',
    'formationId',
    'operationId',
    'sightingTime',
    'createdAt',
    'updatedAt',
    // 引き継いだ目撃（写し）にだけある。元の目撃の operationSightingId
    'carriedFromSightingId',
    // 引き継いだ目撃（写し）にだけある。写した枠の始まり（鉄道日の 0 時からの秒）
    'carriedRunStartSeconds',
);

/** `fields[operationSightingInvalidation]` で選べる列 */
export const OPERATION_SIGHTING_INVALIDATION_COLUMNS = columnsOf(
    'operationSightingInvalidationId',
    'operationSightingId',
    'createdAt',
    'updatedAt',
);

/** 引き継いだ目撃の「目撃されたときの運用」。常に全項目で返す */
export const SIGHTED_AS_OPERATION_COLUMNS = columnsOf(
    'operationId',
    'operationNumber',
);
