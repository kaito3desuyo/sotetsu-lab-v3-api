/**
 * 応答の 1 つの入れ物の宣言（docs/adr/0010-v3-include-and-fields.md）。
 * 木は応答の形を表し、`include`・`fields` で選べる範囲はすべてここから決まる。
 */
export interface SelectionNode {
    /** `fields` のキー。null は `fields` で選べない入れ物（応答をまとめるだけのものなど） */
    readonly resource: string | null;
    /** 応答の項目名 → 元のオブジェクトのプロパティ名。今の全部入りの応答に出ている項目に限る */
    readonly columns: Readonly<Record<string, string>>;
    /** `fields` に無くても返す項目（関連をつなぐ ID）。応答の項目名＝プロパティ名 */
    readonly alwaysKeys?: readonly string[];
    /** 応答のキー → 子 */
    readonly relations?: Readonly<Record<string, SelectionRelation>>;
}

export interface SelectionRelation extends SelectionNode {
    /** 親のオブジェクトのプロパティ名 */
    readonly property: string;
    /** true なら配列、false なら 1 件 */
    readonly many: boolean;
    /** true なら `include` で外せない（常に結合し、常に返す） */
    readonly required?: boolean;
}

export type SelectionTree = SelectionNode;

/** 木を検めて返す。同じ資源の `columns` が食い違えば、定義の誤りとして投げる */
export function defineSelectionTree<const T extends SelectionTree>(tree: T): T {
    const columnsByResource = new Map<string, string>();
    const visit = (node: SelectionNode, path: string): void => {
        if (node.resource !== null) {
            const signature = JSON.stringify(node.columns);
            const known = columnsByResource.get(node.resource);
            if (known !== undefined && known !== signature) {
                throw new Error(
                    `資源 ${node.resource} の columns が ${path} で食い違う`,
                );
            }
            columnsByResource.set(node.resource, signature);
        }
        for (const [key, child] of Object.entries(node.relations ?? {})) {
            visit(child, path === '' ? key : `${path}.${key}`);
        }
    };
    visit(tree, '');
    return tree;
}

/** 応答の項目名とプロパティ名が同じ列の対応を作る */
export function columnsOf(...names: string[]): Record<string, string> {
    return Object.fromEntries(names.map((name) => [name, name]));
}
