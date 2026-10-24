import type { Selection } from './parse-selection.js';
import type { SelectionNode } from './selection-tree.js';

/**
 * 元のオブジェクト（エンティティなど）を木に沿って応答の形にする（docs/adr/0010-v3-include-and-fields.md）。
 * 並びは alwaysKeys → 項目（指定の順。無ければ columns の順）→ 関連（木の順）。
 * 値が null・undefined の項目は省く（false・0・空文字は残す）。道筋に無い関連はキーごと出さない。
 */
export function serializeSelection(
    source: object,
    node: SelectionNode,
    selection: Selection,
    path: string | null = null,
): Record<string, unknown> {
    const record = source as Record<string, unknown>;
    const result: Record<string, unknown> = {};

    const requested =
        node.resource === null
            ? undefined
            : selection.fields.get(node.resource);
    const keys = new Set([
        ...(node.alwaysKeys ?? []),
        ...(requested ?? Object.keys(node.columns)),
    ]);
    for (const key of keys) {
        const value = record[node.columns[key] ?? key];
        if (value !== null && value !== undefined) {
            result[key] = value;
        }
    }

    for (const [key, child] of Object.entries(node.relations ?? {})) {
        const childPath = path === null ? key : `${path}.${key}`;
        if (!selection.paths.has(childPath)) continue;
        const value = record[child.property];
        if (child.many) {
            const items: unknown[] = Array.isArray(value) ? value : [];
            result[key] = items.map((item) =>
                serializeSelection(item as object, child, selection, childPath),
            );
        } else if (value !== null && value !== undefined) {
            result[key] = serializeSelection(
                value as object,
                child,
                selection,
                childPath,
            );
        }
    }
    return result;
}
