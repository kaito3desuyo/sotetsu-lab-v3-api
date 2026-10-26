import { BadRequestException } from '@nestjs/common';
import type {
    SelectionNode,
    SelectionRelation,
    SelectionTree,
} from './selection-tree.js';

/** `include`・`fields` を木で検めた結果（docs/adr/0010-v3-include-and-fields.md） */
export interface Selection {
    /** 結合して返す関連の道筋（応答のキーを `.` でつないだもの）。required の関連も入る */
    readonly paths: ReadonlySet<string>;
    /** 資源 → 返す項目（応答の項目名）。無い資源は全項目 */
    readonly fields: ReadonlyMap<string, ReadonlySet<string>>;
}

interface RelationEntry {
    readonly path: string;
    readonly parentPath: string | null;
    readonly node: SelectionRelation;
}

/** 木の関連を、親が子より先に来る順で平らに並べる */
function flattenRelations(tree: SelectionTree): RelationEntry[] {
    const result: RelationEntry[] = [];
    const visit = (parent: SelectionNode, parentPath: string | null): void => {
        for (const [key, node] of Object.entries(parent.relations ?? {})) {
            const path = parentPath === null ? key : `${parentPath}.${key}`;
            result.push({ path, parentPath, node });
            visit(node, path);
        }
    };
    visit(tree, null);
    return result;
}

/** カンマ区切り（配列で繰り返してもよい）を、空白と空を除いた一覧にする */
function splitList(values: string[]): string[] {
    return values
        .flatMap((value) => value.split(','))
        .map((item) => item.trim())
        .filter((item) => item !== '');
}

/**
 * クエリの `include`・`fields` を読み、口の木で検める。どちらも無ければ undefined（全部入りのまま）。
 * `include` が無く `fields` だけのときは、名前を挙げた資源の関連を結合する（ADR-0002 からの動き）。
 */
export function parseSelection(
    query: { include?: unknown; fields?: unknown },
    tree: SelectionTree,
): Selection | undefined {
    const hasInclude = query.include !== undefined && query.include !== null;
    const hasFields = query.fields !== undefined && query.fields !== null;
    if (!hasInclude && !hasFields) {
        return undefined;
    }

    const relations = flattenRelations(tree);
    const fields = hasFields
        ? parseFields(query.fields, tree, relations)
        : new Map<string, Set<string>>();

    if (!hasInclude) {
        return { paths: pathsFromFields(fields, tree, relations), fields };
    }

    const paths = parseInclude(query.include, relations);
    for (const resource of fields.keys()) {
        if (resource === tree.resource) continue;
        if (
            relations.some(
                (r) => r.node.resource === resource && paths.has(r.path),
            )
        ) {
            continue;
        }
        throw new BadRequestException(
            `fields[${resource}] の資源は include に含まれていない`,
        );
    }
    return { paths, fields };
}

/**
 * read-model の口（計算した DTO を返す口）の `fields` を読む。`include` は受けない。
 * 関連はすべて返し、`fields` に挙げた資源だけ項目を削る（挙げない資源は全項目）。
 */
export function parseFieldsOnly(
    query: { include?: unknown; fields?: unknown },
    tree: SelectionTree,
): Selection | undefined {
    if (query.include !== undefined && query.include !== null) {
        throw new BadRequestException('この口は include を指定できない');
    }
    if (query.fields === undefined || query.fields === null) {
        return undefined;
    }
    const relations = flattenRelations(tree);
    return {
        paths: new Set(relations.map((r) => r.path)),
        fields: parseFields(query.fields, tree, relations),
    };
}

function parseFields(
    raw: unknown,
    tree: SelectionTree,
    relations: RelationEntry[],
): Map<string, Set<string>> {
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
        throw new BadRequestException(
            'fields は fields[資源]=項目,項目 の形で指定する',
        );
    }

    const columnsByResource = new Map<
        string,
        Readonly<Record<string, string>>
    >();
    for (const node of [tree, ...relations.map((r) => r.node)]) {
        if (node.resource !== null && !columnsByResource.has(node.resource)) {
            columnsByResource.set(node.resource, node.columns);
        }
    }

    const result = new Map<string, Set<string>>();
    for (const [resource, value] of Object.entries(raw)) {
        const columns = columnsByResource.get(resource);
        if (!columns) {
            throw new BadRequestException(
                `fields に指定できない資源: ${resource}`,
            );
        }
        const values: unknown[] = Array.isArray(value) ? value : [value];
        if (values.some((v) => typeof v !== 'string')) {
            throw new BadRequestException(
                `fields[${resource}] は文字列で指定する`,
            );
        }
        const names = new Set(splitList(values as string[]));
        for (const name of names) {
            if (!Object.hasOwn(columns, name)) {
                throw new BadRequestException(
                    `fields[${resource}] に指定できない項目: ${name}`,
                );
            }
        }
        result.set(resource, names);
    }
    return result;
}

function parseInclude(raw: unknown, relations: RelationEntry[]): Set<string> {
    if (!relations.some((r) => !r.node.required)) {
        throw new BadRequestException('この口は include を指定できない');
    }
    const values: unknown[] = Array.isArray(raw) ? raw : [raw];
    if (values.some((v) => typeof v !== 'string')) {
        throw new BadRequestException(
            'include は道筋をカンマで区切って指定する',
        );
    }

    const byPath = new Map(relations.map((r) => [r.path, r]));
    const paths = new Set<string>();
    for (const path of splitList(values as string[])) {
        if (!byPath.has(path)) {
            throw new BadRequestException(
                `include に指定できない道筋: ${path}`,
            );
        }
        // 子を挙げたら親も付ける
        for (
            let current: string | null = path;
            current !== null;
            current = byPath.get(current)?.parentPath ?? null
        ) {
            paths.add(current);
        }
    }
    // required の関連は、親が付いていれば（根の直下なら常に）付ける。親が先に来る順なので 1 周で足りる
    for (const r of relations) {
        if (
            r.node.required &&
            (r.parentPath === null || paths.has(r.parentPath))
        ) {
            paths.add(r.path);
        }
    }
    return paths;
}

function pathsFromFields(
    fields: Map<string, Set<string>>,
    tree: SelectionTree,
    relations: RelationEntry[],
): Set<string> {
    const listed = new Set(fields.keys());
    const paths = new Set<string>();
    for (const r of relations) {
        if (r.parentPath !== null && !paths.has(r.parentPath)) continue;
        if (r.node.required) {
            paths.add(r.path);
            // 名前の無い資源は alwaysKeys だけを返す（今の trip-blocks の trip と同じ）
            if (r.node.resource !== null && !fields.has(r.node.resource)) {
                fields.set(r.node.resource, new Set());
            }
        } else if (r.node.resource !== null && listed.has(r.node.resource)) {
            paths.add(r.path);
        }
    }

    // 名前を挙げた資源が 1 か所も結合されなければ、親の資源が欠けている
    const byPath = new Map(relations.map((r) => [r.path, r]));
    for (const resource of listed) {
        if (resource === tree.resource) continue;
        const occurrences = relations.filter(
            (r) => r.node.resource === resource,
        );
        if (occurrences.some((r) => paths.has(r.path))) continue;
        // 出てくる場所すべてについて、資源名を持つ最も近い祖先を集める（重複は除き、木の順）
        const parents = new Set(
            occurrences.map((occurrence) => {
                let parent = byPath.get(occurrence.parentPath ?? '');
                while (parent && parent.node.resource === null) {
                    parent = byPath.get(parent.parentPath ?? '');
                }
                return parent?.node.resource ?? '?';
            }),
        );
        const candidates = [...parents]
            .map((parent) => `fields[${parent}]`)
            .join(' か ');
        throw new BadRequestException(
            `fields[${resource}] には ${candidates} の指定も要る`,
        );
    }
    return paths;
}
