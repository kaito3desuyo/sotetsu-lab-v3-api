import type { Selection } from './parse-selection.js';
import type { SelectionNode } from './selection-tree.js';

/**
 * query builder の `addSelect` に渡す列（docs/adr/0010-v3-include-and-fields.md）。
 * 関連を組み立てるため、主キー `id` と `alwaysKeys` は常に選ぶ。指定が無ければ全列。
 */
export function selectColumns(
    alias: string,
    node: SelectionNode,
    selection: Selection,
): string[] {
    const requested =
        node.resource === null
            ? undefined
            : selection.fields.get(node.resource);
    const keys = requested ? [...requested] : Object.keys(node.columns);
    const properties = [
        'id',
        ...(node.alwaysKeys ?? []),
        ...keys.map((key) => node.columns[key]),
    ];
    return [...new Set(properties)].map((property) => `${alias}.${property}`);
}
