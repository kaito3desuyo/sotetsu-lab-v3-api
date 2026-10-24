# v3 include・fields PR 1（部品と重い 3 本）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** v3 の読み取りの口に `include`（結合の選択）と `fields`（列の選択）を受ける共通の部品を作り、trip-blocks・運用表の trips・運行系統の駅一覧の 3 本に入れる。

**Architecture:** 口ごとに応答の形を「選択の木」（`SelectionTree`）で宣言する。`parseSelection` がクエリを木で検めて `Selection`（道筋の集合と資源ごとの項目）にし、各 query は `selection.paths.has(道筋)` で結合を足し、`selectColumns` で選ぶ列を作り、`serializeSelection` で木に沿って応答を組む。指定が無いときは今の全部入りの道（既存の query・builder）をそのまま通る。

**Tech Stack:** NestJS 12・TypeORM 1.x（`createQueryBuilder`）・Vitest＋SWC・TypeScript strict・ESM

**Spec:** `docs/superpowers/specs/2026-10-24-v3-include-fields-design.md`

## Global Constraints

- 指定（`include`・`fields`）が無いときの応答は 1 バイトも変えない。既存の query・builder・DTO の全部入りの道には手を入れない（駅一覧は計算部分を private メソッドに切り出すだけ）
- trip-blocks の `fields` だけの呼び出しは、今と同じ SQL の呼び出しと同じ応答（キーの順まで）にする
- 400 の文言は日本語。既存の `parseSparseFieldsets` と同じ文言を保つ（`fields は fields[資源]=項目,項目 の形で指定する`・`fields に指定できない資源: X`・`fields[X] は文字列で指定する`・`fields[X] に指定できない項目: Y`・`fields[X] には fields[Y] の指定も要る`）
- ESM: 相対 import には `.js` を付ける。`src/…` の絶対 import は使わない
- query は `createQueryBuilder` だけで書く（`find`・`findOne` を新たに使わない）
- TypeScript strict。`as any`・`@ts-ignore` は使わない（spec の中の既存の書き方は除く）
- lodash は使わない
- テストは SWC を使うので、Claude Code のサンドボックスの外で流す（`npx vitest run <パス>`）
- コミット: Conventional Commits＋絵文字（例 `feat: :sparkles: …`）。ドメイン名は日本語（trip-block → 列車ブロック、operation → 運用、service → 運行系統）。GPG 署名があるのでサンドボックスの外で `git commit`。本文の末尾に次の 2 行

  ```
  Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01FZB1eB3dTj4GQVxda71thf
  ```
- コメントの量と言葉づかいは周りのコードに合わせる（日本語・短く）
- ブランチは `feat/v3-include-fields`。push・PR は作らない（controller が行う）

## Review Focus

1. **`include` の書き方の揺れ**: `include=a&include=b`（配列）、前後の空白、末尾のカンマは受け付ける。→ Task 1 の parse の spec
2. **`include=` を空で付けた trip-blocks**: 列車（required）は全列で返り、時刻などは結合しない。→ Task 2 の query の spec
3. **全線時刻表（client）の実際の `fields` の組み合わせ**: 寄せ直しの前後で応答の文字列が同じ。→ Task 2 の互換の spec
4. **運用表で `include=trips`（時刻を返さない）**: 列車の並びは今と同じ出発時刻順のまま。→ Task 3 の query の spec
5. **駅一覧で `service` を外す**: 駅の並びの計算は今と同じ結果で、応答に `service` のキーが無い。→ Task 4 の query の spec

---

## File Structure

| ファイル | 役目 |
|---|---|
| Create `src/core/utils/selection/selection-tree.ts` | 木の型・`defineSelectionTree`・`columnsOf` |
| Create `src/core/utils/selection/parse-selection.ts` | `Selection` 型・`parseSelection` |
| Create `src/core/utils/selection/select-columns.ts` | `selectColumns` |
| Create `src/core/utils/selection/serialize-selection.ts` | `serializeSelection` |
| Create 上の各 `*.spec.ts` | 部品の unit spec |
| Create `src/libs/trip/usecase/trip-selection-columns.ts` | trip・time・tripOperationList の列 |
| Create `src/libs/trip-class/usecase/trip-class-selection-columns.ts` | tripClass の列 |
| Create `src/libs/operation/usecase/operation-selection-columns.ts` | operation の列 |
| Create `src/libs/calendar/usecase/calendar-selection-columns.ts` | calendar の列 |
| Create `src/libs/service/usecase/service-selection-columns.ts` | service・operatingSystem の列 |
| Create `src/libs/route/usecase/route-selection-columns.ts` | route・routeStationList の列 |
| Create `src/libs/station/usecase/station-selection-columns.ts` | station・stop の列 |
| Create `src/libs/trip-block/usecase/trip-block-selection.ts` | trip-blocks の木 |
| Create `src/libs/operation/usecase/operation-with-trips-selection.ts` | 運用表 trips の木 |
| Create `src/libs/service/usecase/service-stations-selection.ts` | 駅一覧の木 |
| Modify trip-block の query・service・controller・query params と spec | `fields` を新しい部品に寄せ、`include` を受ける |
| Delete `src/core/utils/sparse-fieldsets.ts`（＋spec）、`trip-block-fieldsets.ts`、`trip-block-sparse.dto.ts`、`trip-block-sparse.dto.builder.ts`（＋spec） | 新しい部品に置き換わる |
| Modify operation の query・service・controller と spec | 運用表 trips に `include`・`fields` |
| Modify service の query・service・controller と spec | 駅一覧に `include`・`fields` |
| Create `docs/adr/0010-v3-include-and-fields.md`、Modify ADR-0002・`docs/refactor-instructions.md`・`src/core/configs/express-settings.ts` のコメント | 文書 |

---

### Task 1: 選択の部品（木・読み取り・列・組み立て）

**Files:**
- Create: `src/core/utils/selection/selection-tree.ts`
- Create: `src/core/utils/selection/parse-selection.ts`
- Create: `src/core/utils/selection/select-columns.ts`
- Create: `src/core/utils/selection/serialize-selection.ts`
- Test: `src/core/utils/selection/selection-tree.spec.ts`、`parse-selection.spec.ts`、`select-columns.spec.ts`、`serialize-selection.spec.ts`

**Interfaces:**
- Produces:
  - `interface SelectionNode { readonly resource: string | null; readonly columns: Readonly<Record<string, string>>; readonly alwaysKeys?: readonly string[]; readonly relations?: Readonly<Record<string, SelectionRelation>> }`
  - `interface SelectionRelation extends SelectionNode { readonly property: string; readonly many: boolean; readonly required?: boolean }`
  - `type SelectionTree = SelectionNode`
  - `function defineSelectionTree<const T extends SelectionTree>(tree: T): T`
  - `function columnsOf(...names: string[]): Record<string, string>`
  - `interface Selection { readonly paths: ReadonlySet<string>; readonly fields: ReadonlyMap<string, ReadonlySet<string>> }`
  - `function parseSelection(query: { include?: unknown; fields?: unknown }, tree: SelectionTree): Selection | undefined`
  - `function selectColumns(alias: string, node: SelectionNode, selection: Selection): string[]`
  - `function serializeSelection(source: object, node: SelectionNode, selection: Selection, path?: string | null): Record<string, unknown>`

- [ ] **Step 1: 木の spec を書く**

`src/core/utils/selection/selection-tree.spec.ts`:

```ts
import { columnsOf, defineSelectionTree } from './selection-tree.js';

describe('columnsOf', () => {
    it('応答の項目名とプロパティ名が同じ列の対応を作る', () => {
        expect(columnsOf('id', 'tripNumber')).toEqual({
            id: 'id',
            tripNumber: 'tripNumber',
        });
    });
});

describe('defineSelectionTree', () => {
    it('木をそのまま返す', () => {
        const tree = { resource: null, columns: {} };
        expect(defineSelectionTree(tree)).toBe(tree);
    });

    it('同じ資源の columns が食い違えば定義の誤りとして投げる', () => {
        expect(() =>
            defineSelectionTree({
                resource: null,
                columns: {},
                relations: {
                    startTime: {
                        property: 'startTime',
                        many: false,
                        resource: 'time',
                        columns: columnsOf('stationId'),
                    },
                    endTime: {
                        property: 'endTime',
                        many: false,
                        resource: 'time',
                        columns: columnsOf('stationId', 'arrivalTime'),
                    },
                },
            }),
        ).toThrow('資源 time の columns が endTime で食い違う');
    });
});
```

- [ ] **Step 2: 木を書く**

`src/core/utils/selection/selection-tree.ts`:

```ts
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
```

- [ ] **Step 3: 読み取りの spec を書く**

`src/core/utils/selection/parse-selection.spec.ts`:

```ts
import { BadRequestException } from '@nestjs/common';
import { parseSelection } from './parse-selection.js';
import { columnsOf, defineSelectionTree } from './selection-tree.js';

const TREE = defineSelectionTree({
    resource: null,
    columns: columnsOf('id'),
    alwaysKeys: ['id'],
    relations: {
        trips: {
            property: 'trips',
            many: true,
            required: true,
            resource: 'trip',
            columns: columnsOf('tripNumber', 'tripName'),
            alwaysKeys: ['id'],
            relations: {
                times: {
                    property: 'times',
                    many: true,
                    resource: 'time',
                    columns: columnsOf('id', 'stationId', 'arrivalTime'),
                },
                operation: {
                    property: 'operation',
                    many: false,
                    resource: 'operation',
                    columns: {
                        operationId: 'id',
                        operationNumber: 'operationNumber',
                    },
                    relations: {
                        calendar: {
                            property: 'calendar',
                            many: false,
                            resource: 'calendar',
                            columns: columnsOf('calendarName'),
                        },
                    },
                },
            },
        },
    },
});

// include を受けない口（関連がすべて required）
const REQUIRED_ONLY_TREE = defineSelectionTree({
    resource: null,
    columns: {},
    relations: {
        stations: {
            property: 'stations',
            many: true,
            required: true,
            resource: 'station',
            columns: columnsOf('stationName'),
        },
    },
});

function expect400(run: () => unknown, message: string): void {
    expect(run).toThrow(BadRequestException);
    expect(run).toThrow(message);
}

describe('parseSelection - 指定なし', () => {
    it('include も fields も無ければ undefined（全部入りのまま）', () => {
        expect(parseSelection({}, TREE)).toBeUndefined();
        expect(
            parseSelection({ include: null, fields: undefined }, TREE),
        ).toBeUndefined();
    });
});

describe('parseSelection - fields だけ（今の trip-blocks と同じ動き）', () => {
    it('名前を挙げた資源の関連を結合する', () => {
        const selection = parseSelection(
            { fields: { trip: 'tripNumber', time: 'stationId,arrivalTime' } },
            TREE,
        );
        expect(selection?.paths).toEqual(new Set(['trips', 'trips.times']));
        expect(selection?.fields.get('trip')).toEqual(new Set(['tripNumber']));
        expect(selection?.fields.get('time')).toEqual(
            new Set(['stationId', 'arrivalTime']),
        );
    });

    it('required の関連の資源で名前の無いものは alwaysKeys だけ（空の項目）にする', () => {
        const selection = parseSelection(
            { fields: { time: 'stationId' } },
            TREE,
        );
        expect(selection?.paths).toEqual(new Set(['trips', 'trips.times']));
        expect(selection?.fields.get('trip')).toEqual(new Set());
    });

    it('同じ資源を繰り返し指定した配列も受け付ける', () => {
        const selection = parseSelection(
            { fields: { time: ['stationId', 'arrivalTime'] } },
            TREE,
        );
        expect(selection?.fields.get('time')).toEqual(
            new Set(['stationId', 'arrivalTime']),
        );
    });

    it('空白と空の項目は捨てる', () => {
        const selection = parseSelection(
            { fields: { trip: ' tripNumber , ,' } },
            TREE,
        );
        expect(selection?.fields.get('trip')).toEqual(new Set(['tripNumber']));
    });

    it('親の資源が欠けていれば 400', () => {
        expect400(
            () =>
                parseSelection({ fields: { calendar: 'calendarName' } }, TREE),
            'fields[calendar] には fields[operation] の指定も要る',
        );
    });

    it('fields が文字列の入れ子でなければ 400', () => {
        expect400(
            () => parseSelection({ fields: 'tripNumber' }, TREE),
            'fields は fields[資源]=項目,項目 の形で指定する',
        );
        expect400(
            () => parseSelection({ fields: ['tripNumber'] }, TREE),
            'fields は fields[資源]=項目,項目 の形で指定する',
        );
        expect400(
            () => parseSelection({ fields: { trip: { a: 'b' } } }, TREE),
            'fields[trip] は文字列で指定する',
        );
    });

    it('木に無い資源・項目は 400', () => {
        expect400(
            () => parseSelection({ fields: { user: 'password' } }, TREE),
            'fields に指定できない資源: user',
        );
        expect400(
            () => parseSelection({ fields: { trip: 'password' } }, TREE),
            'fields[trip] に指定できない項目: password',
        );
        // alwaysKeys は columns に無いので選べない（常に返る）
        expect400(
            () => parseSelection({ fields: { trip: 'id' } }, TREE),
            'fields[trip] に指定できない項目: id',
        );
        // 資源を持たない根は選べない
        expect400(
            () => parseSelection({ fields: { tripBlock: 'id' } }, TREE),
            'fields に指定できない資源: tripBlock',
        );
    });
});

describe('parseSelection - include', () => {
    it('子を挙げれば親も付き、required の関連は常に付く', () => {
        const selection = parseSelection(
            { include: 'trips.operation.calendar' },
            TREE,
        );
        expect(selection?.paths).toEqual(
            new Set(['trips', 'trips.operation', 'trips.operation.calendar']),
        );
        expect(selection?.fields.size).toBe(0);
    });

    it('配列・空白・末尾のカンマを受け付ける', () => {
        const selection = parseSelection(
            { include: ['trips.times', ' trips.operation ,'] },
            TREE,
        );
        expect(selection?.paths).toEqual(
            new Set(['trips', 'trips.times', 'trips.operation']),
        );
    });

    it('空の include は required の関連だけ', () => {
        expect(parseSelection({ include: '' }, TREE)?.paths).toEqual(
            new Set(['trips']),
        );
    });

    it('fields と併せたとき、fields は列だけを絞る', () => {
        const selection = parseSelection(
            { include: 'trips.times', fields: { time: 'stationId' } },
            TREE,
        );
        expect(selection?.paths).toEqual(new Set(['trips', 'trips.times']));
        expect(selection?.fields.get('time')).toEqual(new Set(['stationId']));
        // include のときは、名前の無い資源は全列（空の項目を入れない）
        expect(selection?.fields.has('trip')).toBe(false);
    });

    it('結合されない資源の fields は 400', () => {
        expect400(
            () =>
                parseSelection(
                    { include: 'trips.operation', fields: { time: 'stationId' } },
                    TREE,
                ),
            'fields[time] の資源は include に含まれていない',
        );
    });

    it('木に無い道筋は 400', () => {
        expect400(
            () => parseSelection({ include: 'trips.service' }, TREE),
            'include に指定できない道筋: trips.service',
        );
        expect400(
            () => parseSelection({ include: 'times' }, TREE),
            'include に指定できない道筋: times',
        );
    });

    it('文字列でなければ 400', () => {
        expect400(
            () => parseSelection({ include: { a: 'b' } }, TREE),
            'include は道筋をカンマで区切って指定する',
        );
    });

    it('選べる関連の無い口では 400', () => {
        expect400(
            () => parseSelection({ include: '' }, REQUIRED_ONLY_TREE),
            'この口は include を指定できない',
        );
    });
});
```

- [ ] **Step 4: 読み取りを書く**

`src/core/utils/selection/parse-selection.ts`:

```ts
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
        let parent = byPath.get(occurrences[0].parentPath ?? '');
        while (parent && parent.node.resource === null) {
            parent = byPath.get(parent.parentPath ?? '');
        }
        throw new BadRequestException(
            `fields[${resource}] には fields[${parent?.node.resource ?? '?'}] の指定も要る`,
        );
    }
    return paths;
}
```

- [ ] **Step 5: 列と組み立ての spec を書く**

`src/core/utils/selection/select-columns.spec.ts`:

```ts
import { selectColumns } from './select-columns.js';
import { columnsOf } from './selection-tree.js';

const OPERATION = {
    resource: 'operation',
    columns: {
        operationId: 'id',
        calendarId: 'calendarId',
        operationNumber: 'operationNumber',
    },
    alwaysKeys: ['id'],
};

describe('selectColumns', () => {
    it('主キー・alwaysKeys・指定の列を、別名つきで重複なく返す', () => {
        const selection = {
            paths: new Set<string>(),
            fields: new Map([
                ['operation', new Set(['operationId', 'operationNumber'])],
            ]),
        };
        expect(selectColumns('operation', OPERATION, selection)).toEqual([
            'operation.id',
            'operation.operationNumber',
        ]);
    });

    it('指定が無ければ全列', () => {
        const selection = { paths: new Set<string>(), fields: new Map() };
        expect(selectColumns('operation', OPERATION, selection)).toEqual([
            'operation.id',
            'operation.calendarId',
            'operation.operationNumber',
        ]);
    });

    it('空の指定なら主キーと alwaysKeys だけ', () => {
        const selection = {
            paths: new Set<string>(),
            fields: new Map([['trip', new Set<string>()]]),
        };
        const trip = {
            resource: 'trip',
            columns: columnsOf('tripNumber'),
            alwaysKeys: ['id'],
        };
        expect(selectColumns('trips', trip, selection)).toEqual(['trips.id']);
    });
});
```

`src/core/utils/selection/serialize-selection.spec.ts`:

```ts
import { serializeSelection } from './serialize-selection.js';
import { columnsOf, defineSelectionTree } from './selection-tree.js';

const TREE = defineSelectionTree({
    resource: null,
    columns: {},
    relations: {
        operation: {
            property: 'operation',
            many: false,
            required: true,
            resource: 'operation',
            columns: {
                operationId: 'id',
                operationNumber: 'operationNumber',
                createdAt: 'createdAt',
            },
            alwaysKeys: ['id'],
        },
        trips: {
            property: 'trips',
            many: true,
            resource: 'tripOperationList',
            columns: columnsOf('tripId', 'nextTripOperationListId'),
            relations: {
                trip: {
                    property: 'trip',
                    many: false,
                    resource: 'trip',
                    columns: columnsOf('tripNumber', 'depotIn', 'tripName'),
                },
            },
        },
    },
});

const CREATED = new Date('2026-03-02T12:19:35.485Z');
const SOURCE = {
    operation: {
        id: 'op1',
        operationNumber: '54',
        createdAt: CREATED,
        calendarId: 'c1',
    },
    trips: [
        {
            tripId: 't1',
            nextTripOperationListId: null,
            trip: { tripNumber: '6000', depotIn: false, tripName: '' },
        },
        { tripId: 't2', nextTripOperationListId: 'tol9', trip: null },
    ],
};

describe('serializeSelection', () => {
    it('alwaysKeys → 項目 → 関連の順に組み、null・undefined は省き、false・0・空文字は残す', () => {
        const result = serializeSelection(SOURCE, TREE, {
            paths: new Set(['operation', 'trips', 'trips.trip']),
            fields: new Map(),
        });
        expect(JSON.stringify(result)).toBe(
            JSON.stringify({
                operation: {
                    id: 'op1',
                    operationId: 'op1',
                    operationNumber: '54',
                    createdAt: CREATED,
                },
                trips: [
                    {
                        tripId: 't1',
                        trip: {
                            tripNumber: '6000',
                            depotIn: false,
                            tripName: '',
                        },
                    },
                    { tripId: 't2', nextTripOperationListId: 'tol9' },
                ],
            }),
        );
    });

    it('指定の項目は指定の順に並べ、道筋に無い関連はキーごと出さない', () => {
        const result = serializeSelection(SOURCE, TREE, {
            paths: new Set(['operation']),
            fields: new Map([
                ['operation', new Set(['operationNumber', 'operationId'])],
            ]),
        });
        expect(JSON.stringify(result)).toBe(
            JSON.stringify({
                operation: {
                    id: 'op1',
                    operationNumber: '54',
                    operationId: 'op1',
                },
            }),
        );
    });

    it('配列の関連が読み込まれていなければ空の配列', () => {
        const result = serializeSelection(
            { operation: { id: 'op1' } },
            TREE,
            {
                paths: new Set(['operation', 'trips']),
                fields: new Map([['operation', new Set<string>()]]),
            },
        );
        expect(result).toEqual({ operation: { id: 'op1' }, trips: [] });
    });
});
```

- [ ] **Step 6: spec が落ちることを確かめる**

Run（サンドボックスの外）: `npx vitest run src/core/utils/selection`
Expected: FAIL（`./parse-selection.js` などが見つからない）

- [ ] **Step 7: 列と組み立てを書く**

`src/core/utils/selection/select-columns.ts`:

```ts
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
        node.resource === null ? undefined : selection.fields.get(node.resource);
    const keys = requested ? [...requested] : Object.keys(node.columns);
    const properties = [
        'id',
        ...(node.alwaysKeys ?? []),
        ...keys.map((key) => node.columns[key]),
    ];
    return [...new Set(properties)].map((property) => `${alias}.${property}`);
}
```

`src/core/utils/selection/serialize-selection.ts`:

```ts
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
        node.resource === null ? undefined : selection.fields.get(node.resource);
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
```

- [ ] **Step 8: spec が通ることを確かめる**

Run（サンドボックスの外）: `npx vitest run src/core/utils/selection`
Expected: PASS（4 ファイル）

- [ ] **Step 9: コミット**

```bash
git add src/core/utils/selection
git commit -m "feat: :sparkles: 結合と列を選ぶ部品（include・fields）を足す" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01FZB1eB3dTj4GQVxda71thf"
```

---

### Task 2: 列車ブロックの fields を新しい部品に寄せ、include を受ける

**Files:**
- Create: `src/libs/trip/usecase/trip-selection-columns.ts`
- Create: `src/libs/trip-class/usecase/trip-class-selection-columns.ts`
- Create: `src/libs/operation/usecase/operation-selection-columns.ts`
- Create: `src/libs/trip-block/usecase/trip-block-selection.ts`
- Create: `src/libs/trip-block/usecase/trip-block-selection.spec.ts`
- Modify: `src/libs/trip-block/infrastructure/queries/trip-block.query.ts`（`findManyByFilterWithFields` を `findManyByFilterWithSelection` に置き換え）
- Modify: `src/libs/trip-block/infrastructure/queries/trip-block.query.spec.ts`
- Modify: `src/libs/trip-block/usecase/trip-block.v3.service.ts`（`findManyByFilter`）と spec
- Modify: `src/libs/trip-block/usecase/params/trip-block-find-many-by-filter.query.ts` と spec
- Modify: `src/libs/trip-block/presentation/trip-block.v3.controller.ts`
- Delete: `src/core/utils/sparse-fieldsets.ts`、`src/core/utils/sparse-fieldsets.spec.ts`、`src/libs/trip-block/usecase/trip-block-fieldsets.ts`、`src/libs/trip-block/usecase/dtos/trip-block-sparse.dto.ts`、`src/libs/trip-block/infrastructure/builders/trip-block-sparse.dto.builder.ts`、`src/libs/trip-block/infrastructure/builders/trip-block-sparse.dto.builder.spec.ts`

**Interfaces:**
- Consumes: Task 1 の `defineSelectionTree`・`columnsOf`・`Selection`・`parseSelection`・`selectColumns`・`serializeSelection`（パスは `src/core/utils/selection/*.js`）
- Produces:
  - `TRIP_COLUMNS`・`TIME_COLUMNS`・`TRIP_OPERATION_LIST_COLUMNS`（`src/libs/trip/usecase/trip-selection-columns.ts`）
  - `TRIP_CLASS_COLUMNS`（`src/libs/trip-class/usecase/trip-class-selection-columns.ts`）
  - `OPERATION_COLUMNS`（`src/libs/operation/usecase/operation-selection-columns.ts`）
  - `TRIP_BLOCK_SELECTION_TREE`
  - `TripBlockQuery.findManyByFilterWithSelection(params: { calendarId: string; tripDirection: number }, selection: Selection): Promise<Record<string, unknown>[]>`
  - `TripBlockV3Service.findManyByFilter(params: { calendarId: string; tripDirection: number; include?: unknown; fields?: unknown }): Promise<TripBlockDetailsDto[] | Record<string, unknown>[]>`

- [ ] **Step 1: 資源ごとの列を書く**（Task 3 も使う）

`src/libs/trip/usecase/trip-selection-columns.ts`:

```ts
import { columnsOf } from '../../../core/utils/selection/selection-tree.js';

/** `fields[trip]` で選べる列。id は alwaysKeys で常に返すので載せない（docs/adr/0010-v3-include-and-fields.md） */
export const TRIP_COLUMNS = columnsOf(
    'serviceId',
    'tripNumber',
    'tripClassId',
    'tripName',
    'tripDirection',
    'tripBlockId',
    'depotIn',
    'depotOut',
    'calendarId',
    'extraCalendarId',
    'createdAt',
    'updatedAt',
);

/** `fields[time]` で選べる列 */
export const TIME_COLUMNS = columnsOf(
    'id',
    'tripId',
    'stationId',
    'stopId',
    'stopSequence',
    'pickupType',
    'dropoffType',
    'arrivalDays',
    'arrivalTime',
    'departureDays',
    'departureTime',
    'createdAt',
    'updatedAt',
);

/** `fields[tripOperationList]` で選べる列 */
export const TRIP_OPERATION_LIST_COLUMNS = columnsOf(
    'id',
    'tripId',
    'operationId',
    'startStationId',
    'endStationId',
    'startTimeId',
    'endTimeId',
    'nextTripOperationListId',
    'createdAt',
    'updatedAt',
);
```

`src/libs/trip-class/usecase/trip-class-selection-columns.ts`:

```ts
import { columnsOf } from '../../../core/utils/selection/selection-tree.js';

/** `fields[tripClass]` で選べる列（docs/adr/0010-v3-include-and-fields.md） */
export const TRIP_CLASS_COLUMNS = columnsOf(
    'id',
    'serviceId',
    'tripClassName',
    'tripClassColor',
    'sequence',
    'createdAt',
    'updatedAt',
);
```

`src/libs/operation/usecase/operation-selection-columns.ts`:

```ts
import { columnsOf } from '../../../core/utils/selection/selection-tree.js';

/** `fields[operation]` で選べる列（docs/adr/0010-v3-include-and-fields.md） */
export const OPERATION_COLUMNS = columnsOf(
    'id',
    'calendarId',
    'operationNumber',
    'createdAt',
    'updatedAt',
);
```

- [ ] **Step 2: 列車ブロックの木と、互換の spec を書く**

`src/libs/trip-block/usecase/trip-block-selection.ts`:

```ts
import {
    columnsOf,
    defineSelectionTree,
} from '../../../core/utils/selection/selection-tree.js';
import { OPERATION_COLUMNS } from '../../operation/usecase/operation-selection-columns.js';
import { TRIP_CLASS_COLUMNS } from '../../trip-class/usecase/trip-class-selection-columns.js';
import {
    TIME_COLUMNS,
    TRIP_COLUMNS,
    TRIP_OPERATION_LIST_COLUMNS,
} from '../../trip/usecase/trip-selection-columns.js';

/**
 * `GET /v3/trip-blocks` の `include`・`fields` で選べる範囲（docs/adr/0010-v3-include-and-fields.md）。
 * trip-block と trip の id は常に返す。列車（trips）は外せない。
 */
export const TRIP_BLOCK_SELECTION_TREE = defineSelectionTree({
    resource: null,
    columns: columnsOf('id'),
    alwaysKeys: ['id'],
    relations: {
        trips: {
            property: 'trips',
            many: true,
            required: true,
            resource: 'trip',
            columns: TRIP_COLUMNS,
            alwaysKeys: ['id'],
            relations: {
                times: {
                    property: 'times',
                    many: true,
                    resource: 'time',
                    columns: TIME_COLUMNS,
                },
                tripOperationLists: {
                    property: 'tripOperationLists',
                    many: true,
                    resource: 'tripOperationList',
                    columns: TRIP_OPERATION_LIST_COLUMNS,
                    relations: {
                        operation: {
                            property: 'operation',
                            many: false,
                            resource: 'operation',
                            columns: OPERATION_COLUMNS,
                        },
                    },
                },
                tripClass: {
                    property: 'tripClass',
                    many: false,
                    resource: 'tripClass',
                    columns: TRIP_CLASS_COLUMNS,
                },
            },
        },
    },
});
```

`src/libs/trip-block/usecase/trip-block-selection.spec.ts`（今の `TripBlockSparseDtoBuilder` の spec と全線時刻表の組み合わせを、文字列で比べる。キーの順まで同じであることを見る）:

```ts
import { parseSelection } from '../../../core/utils/selection/parse-selection.js';
import { serializeSelection } from '../../../core/utils/selection/serialize-selection.js';
import { TripBlockSparseDtoBuilder } from '../infrastructure/builders/trip-block-sparse.dto.builder.js';
import { TripBlockModel } from '../infrastructure/models/trip-block.model.js';
import { TRIP_BLOCK_SELECTION_TREE } from './trip-block-selection.js';

const MODELS = [
    {
        id: 'b1',
        createdAt: new Date(),
        trips: [
            {
                id: 't1',
                tripNumber: '7416',
                tripDirection: 0,
                tripName: null,
                createdAt: new Date(),
                times: [
                    {
                        id: 'tm1',
                        stationId: 's1',
                        stopSequence: 1,
                        arrivalTime: null,
                        departureTime: '10:00:00',
                        pickupType: 0,
                    },
                    {
                        id: 'tm2',
                        stationId: 's2',
                        stopSequence: 2,
                        arrivalTime: null,
                        departureTime: null,
                        pickupType: 1,
                    },
                ],
                tripOperationLists: [
                    {
                        id: 'tol1',
                        operationId: 'op1',
                        operation: {
                            id: 'op1',
                            operationNumber: '94G',
                            calendarId: 'c1',
                        },
                    },
                ],
                tripClass: { id: 'tc1', tripClassName: '各停' },
            },
        ],
    },
] as unknown as TripBlockModel[];

// client の全線時刻表が今送っている fields（.context/ssr-plan/response-anatomy.mjs の ALL_LINE_FIELDS）
const ALL_LINE_FIELDS = {
    trip: 'tripNumber,tripDirection,tripBlockId,tripClassId,calendarId',
    time: 'stationId,stopSequence,arrivalDays,arrivalTime,departureDays,departureTime,pickupType,dropoffType',
    tripOperationList: 'operationId',
    operation: 'operationNumber',
    tripClass: 'tripClassName,tripClassColor',
};

const CASES: [string, Record<string, string>, unknown][] = [
    [
        'trip と time',
        {
            trip: 'tripNumber,tripDirection,tripName',
            time: 'stationId,stopSequence,arrivalTime,departureTime',
        },
        [
            {
                id: 'b1',
                trips: [
                    {
                        id: 't1',
                        tripNumber: '7416',
                        tripDirection: 0,
                        times: [
                            {
                                stationId: 's1',
                                stopSequence: 1,
                                departureTime: '10:00:00',
                            },
                            { stationId: 's2', stopSequence: 2 },
                        ],
                    },
                ],
            },
        ],
    ],
    [
        '運用の一覧・運用・種別',
        {
            trip: '',
            tripOperationList: 'operationId',
            operation: 'operationNumber',
            tripClass: 'tripClassName',
        },
        [
            {
                id: 'b1',
                trips: [
                    {
                        id: 't1',
                        tripOperationLists: [
                            {
                                operationId: 'op1',
                                operation: { operationNumber: '94G' },
                            },
                        ],
                        tripClass: { tripClassName: '各停' },
                    },
                ],
            },
        ],
    ],
    [
        '全線時刻表',
        ALL_LINE_FIELDS,
        [
            {
                id: 'b1',
                trips: [
                    {
                        id: 't1',
                        tripNumber: '7416',
                        tripDirection: 0,
                        times: [
                            {
                                stationId: 's1',
                                stopSequence: 1,
                                departureTime: '10:00:00',
                                pickupType: 0,
                            },
                            {
                                stationId: 's2',
                                stopSequence: 2,
                                pickupType: 1,
                            },
                        ],
                        tripOperationLists: [
                            {
                                operationId: 'op1',
                                operation: { operationNumber: '94G' },
                            },
                        ],
                        tripClass: { tripClassName: '各停' },
                    },
                ],
            },
        ],
    ],
];

describe('TRIP_BLOCK_SELECTION_TREE - fields だけの応答は ADR-0002 の頃と同じ', () => {
    it.each(CASES)('%s', (_, fields, expected) => {
        const selection = parseSelection({ fields }, TRIP_BLOCK_SELECTION_TREE);
        const result = MODELS.map((model) =>
            serializeSelection(model, TRIP_BLOCK_SELECTION_TREE, selection!),
        );
        expect(JSON.stringify(result)).toBe(JSON.stringify(expected));
    });

    // 寄せ直しの確かめ用。Step 9 で古い builder と一緒に消す
    it.each(CASES)('古い builder と同じ: %s', (_, fields) => {
        const selection = parseSelection({ fields }, TRIP_BLOCK_SELECTION_TREE);
        const result = MODELS.map((model) =>
            serializeSelection(model, TRIP_BLOCK_SELECTION_TREE, selection!),
        );
        const old = TripBlockSparseDtoBuilder.buildFromModel(
            MODELS,
            selection!.fields,
        );
        expect(JSON.stringify(result)).toBe(JSON.stringify(old));
    });
});
```

- [ ] **Step 3: 互換の spec が通ることを確かめる**

Run（サンドボックスの外）: `npx vitest run src/libs/trip-block/usecase/trip-block-selection.spec.ts`
Expected: PASS（6 件）。落ちたら、木の relations の順・columns・alwaysKeys を古い builder（`trip-block-sparse.dto.builder.ts`）に合わせて直す。期待値の方は変えない。

- [ ] **Step 4: query の spec を書き換える**

`src/libs/trip-block/infrastructure/queries/trip-block.query.spec.ts` の `describe('TripBlockQuery - findManyByFilterWithFields', …)` を次に置き換える（`findOneTripBlockByTripId` の describe はそのまま残す）。冒頭の import に `parseSelection` と `TRIP_BLOCK_SELECTION_TREE` を足す。

```ts
import { parseSelection } from '../../../../core/utils/selection/parse-selection.js';
import { TRIP_BLOCK_SELECTION_TREE } from '../../usecase/trip-block-selection.js';
```

```ts
describe('TripBlockQuery - findManyByFilterWithSelection', () => {
    let qb: Record<string, AnyMock>;
    let query: TripBlockQuery;

    const select = (raw: { include?: unknown; fields?: unknown }) =>
        parseSelection(raw, TRIP_BLOCK_SELECTION_TREE)!;

    beforeEach(async () => {
        qb = buildQueryBuilderMock([
            {
                id: 'b1',
                trips: [
                    {
                        id: 't1',
                        tripNumber: '7416',
                        times: [
                            { id: 'tm1', stationId: 's1', arrivalTime: null },
                        ],
                    },
                ],
            },
        ]);
        const repository = {
            createQueryBuilder: vi.fn().mockReturnValue(qb),
        };
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TripBlockQuery,
                {
                    provide: getRepositoryToken(TripBlockModel),
                    useValue: repository,
                },
            ],
        }).compile();
        query = module.get(TripBlockQuery);
    });

    it('fields だけ: 指定した資源の関連だけを結合し、指定した列と主キーだけを選ぶ', async () => {
        const result = await query.findManyByFilterWithSelection(
            { calendarId: 'c1', tripDirection: 0 },
            select({
                fields: { trip: 'tripNumber', time: 'stationId,arrivalTime' },
            }),
        );

        expect(qb.select).toHaveBeenCalledWith(['tripBlock.id']);
        expect(qb.innerJoin).toHaveBeenCalledWith(
            'tripBlock.trips',
            'filterTrip',
            'filterTrip.calendarId = :calendarId AND filterTrip.tripDirection = :tripDirection',
            { calendarId: 'c1', tripDirection: 0 },
        );
        expect(qb.leftJoin).toHaveBeenCalledWith('tripBlock.trips', 'trips');
        expect(qb.addSelect).toHaveBeenCalledWith([
            'trips.id',
            'trips.tripNumber',
        ]);
        expect(qb.leftJoin).toHaveBeenCalledWith('trips.times', 'times');
        expect(qb.addSelect).toHaveBeenCalledWith([
            'times.id',
            'times.stationId',
            'times.arrivalTime',
        ]);
        expect(qb.leftJoin).not.toHaveBeenCalledWith(
            'trips.tripOperationLists',
            'tripOperationLists',
        );
        expect(qb.leftJoin).not.toHaveBeenCalledWith(
            'trips.tripClass',
            'tripClass',
        );
        expect(qb.orderBy).toHaveBeenCalledWith(
            'times.departureDays',
            'ASC',
            'NULLS LAST',
        );
        expect(result).toEqual([
            {
                id: 'b1',
                trips: [
                    {
                        id: 't1',
                        tripNumber: '7416',
                        times: [{ stationId: 's1' }],
                    },
                ],
            },
        ]);
    });

    it('fields だけ: 運用の一覧・運用・種別を指定すればそれぞれ結合する', async () => {
        await query.findManyByFilterWithSelection(
            { calendarId: 'c1', tripDirection: 1 },
            select({
                fields: {
                    trip: '',
                    tripOperationList: 'operationId',
                    operation: 'operationNumber',
                    tripClass: 'tripClassName',
                },
            }),
        );

        expect(qb.addSelect).toHaveBeenCalledWith(['trips.id']);
        expect(qb.leftJoin).toHaveBeenCalledWith(
            'trips.tripOperationLists',
            'tripOperationLists',
        );
        expect(qb.addSelect).toHaveBeenCalledWith([
            'tripOperationLists.id',
            'tripOperationLists.operationId',
        ]);
        expect(qb.leftJoin).toHaveBeenCalledWith(
            'tripOperationLists.operation',
            'operation',
        );
        expect(qb.addSelect).toHaveBeenCalledWith([
            'operation.id',
            'operation.operationNumber',
        ]);
        expect(qb.leftJoin).toHaveBeenCalledWith(
            'trips.tripClass',
            'tripClass',
        );
        expect(qb.addSelect).toHaveBeenCalledWith([
            'tripClass.id',
            'tripClass.tripClassName',
        ]);
        expect(qb.orderBy).not.toHaveBeenCalled();
    });

    it('空の include: 列車は全列で返し、ほかの関連は結合しない', async () => {
        await query.findManyByFilterWithSelection(
            { calendarId: 'c1', tripDirection: 0 },
            select({ include: '' }),
        );

        expect(qb.addSelect).toHaveBeenCalledWith([
            'trips.id',
            'trips.serviceId',
            'trips.tripNumber',
            'trips.tripClassId',
            'trips.tripName',
            'trips.tripDirection',
            'trips.tripBlockId',
            'trips.depotIn',
            'trips.depotOut',
            'trips.calendarId',
            'trips.extraCalendarId',
            'trips.createdAt',
            'trips.updatedAt',
        ]);
        expect(qb.leftJoin).toHaveBeenCalledTimes(1);
        expect(qb.orderBy).not.toHaveBeenCalled();
    });

    it('include で運用を挙げれば、運用の一覧も結合する', async () => {
        await query.findManyByFilterWithSelection(
            { calendarId: 'c1', tripDirection: 0 },
            select({
                include: 'trips.tripOperationLists.operation',
                fields: { operation: 'operationNumber' },
            }),
        );

        expect(qb.leftJoin).toHaveBeenCalledWith(
            'trips.tripOperationLists',
            'tripOperationLists',
        );
        expect(qb.leftJoin).toHaveBeenCalledWith(
            'tripOperationLists.operation',
            'operation',
        );
        expect(qb.addSelect).toHaveBeenCalledWith([
            'operation.id',
            'operation.operationNumber',
        ]);
    });
});
```

- [ ] **Step 5: spec が落ちることを確かめる**

Run（サンドボックスの外）: `npx vitest run src/libs/trip-block/infrastructure/queries/trip-block.query.spec.ts`
Expected: FAIL（`findManyByFilterWithSelection` が無い）

- [ ] **Step 6: query を書き換える**

`trip-block.query.ts` の `findManyByFilterWithFields` を消し、同じ場所に次を書く。import の `SparseFieldsets`・`TripBlockSparseDto`・`TripBlockSparseDtoBuilder` を消し、次を足す。

```ts
import type { Selection } from '../../../../core/utils/selection/parse-selection.js';
import { selectColumns } from '../../../../core/utils/selection/select-columns.js';
import { serializeSelection } from '../../../../core/utils/selection/serialize-selection.js';
import { TRIP_BLOCK_SELECTION_TREE } from '../../usecase/trip-block-selection.js';
```

```ts
    /**
     * `findManyByFilter` と同じ条件で、`include`・`fields` で選んだ関連・列だけを返す
     * （docs/adr/0010-v3-include-and-fields.md）。選ばれない関連は結合しない。
     * 関連を組み立てるため、結合した資源の主キーは常に選ぶ（応答には指定したときだけ出す）。
     */
    async findManyByFilterWithSelection(
        params: { calendarId: string; tripDirection: number },
        selection: Selection,
    ): Promise<Record<string, unknown>[]> {
        const { calendarId, tripDirection } = params;
        const tree = TRIP_BLOCK_SELECTION_TREE;
        const trips = tree.relations.trips;

        const qb = this.tripBlockRepository
            .createQueryBuilder('tripBlock')
            .select(selectColumns('tripBlock', tree, selection))
            .innerJoin(
                'tripBlock.trips',
                'filterTrip',
                'filterTrip.calendarId = :calendarId AND filterTrip.tripDirection = :tripDirection',
                { calendarId, tripDirection },
            )
            .leftJoin('tripBlock.trips', 'trips')
            .addSelect(selectColumns('trips', trips, selection));

        if (selection.paths.has('trips.times')) {
            qb.leftJoin('trips.times', 'times').addSelect(
                selectColumns('times', trips.relations.times, selection),
            );
        }
        if (selection.paths.has('trips.tripOperationLists')) {
            qb.leftJoin(
                'trips.tripOperationLists',
                'tripOperationLists',
            ).addSelect(
                selectColumns(
                    'tripOperationLists',
                    trips.relations.tripOperationLists,
                    selection,
                ),
            );
        }
        if (selection.paths.has('trips.tripOperationLists.operation')) {
            qb.leftJoin('tripOperationLists.operation', 'operation').addSelect(
                selectColumns(
                    'operation',
                    trips.relations.tripOperationLists.relations.operation,
                    selection,
                ),
            );
        }
        if (selection.paths.has('trips.tripClass')) {
            qb.leftJoin('trips.tripClass', 'tripClass').addSelect(
                selectColumns('tripClass', trips.relations.tripClass, selection),
            );
        }
        if (selection.paths.has('trips.times')) {
            qb.orderBy('times.departureDays', 'ASC', 'NULLS LAST').addOrderBy(
                'times.departureTime',
                'ASC',
                'NULLS LAST',
            );
        }

        const models = await qb.getMany();
        return models.map((model) =>
            serializeSelection(model, tree, selection),
        );
    }
```

- [ ] **Step 7: service・controller・query params を書き換える**

`trip-block.v3.service.ts`: import の `parseSparseFieldsets`・`TripBlockSparseDto`・`TRIP_BLOCK_FIELDSET_*` を消し、`parseSelection` と `TRIP_BLOCK_SELECTION_TREE` を足す。`findManyByFilter` を次にする。

```ts
    /**
     * `include`・`fields` が無ければ全項目、あれば木で検めて選んだ関連・列だけを返す
     * （docs/adr/0010-v3-include-and-fields.md）。
     */
    async findManyByFilter(params: {
        calendarId: string;
        tripDirection: number;
        include?: unknown;
        fields?: unknown;
    }): Promise<TripBlockDetailsDto[] | Record<string, unknown>[]> {
        const { calendarId, tripDirection, include, fields } = params;
        const selection = parseSelection(
            { include, fields },
            TRIP_BLOCK_SELECTION_TREE,
        );
        if (!selection) {
            return this.tripBlockQuery.findManyByFilter({
                calendarId,
                tripDirection,
            });
        }
        return this.tripBlockQuery.findManyByFilterWithSelection(
            { calendarId, tripDirection },
            selection,
        );
    }
```

`trip-block-find-many-by-filter.query.ts` に `include` を足し、`fields` のコメントの ADR を直す。`IsString` は既に import 済み。

```ts
    /**
     * 結合する関連の道筋 `include=trips.times,trips.tripClass`（docs/adr/0010-v3-include-and-fields.md）。
     * 中身の検め（木）はサービスで行う。繰り返し指定した配列も受ける。
     */
    @IsOptional()
    @IsString({ each: true })
    include?: string | string[];

    /**
     * 返す項目の選択 `fields[資源]=項目,項目`（docs/adr/0010-v3-include-and-fields.md）。
     * 中身の検め（木）はサービスで行う。
     */
    @IsOptional()
    @IsObject()
    fields?: Record<string, string | string[]>;
```

`trip-block.v3.controller.ts`: `TripBlockSparseDto` の import を消す。`findManyByFilter` のコメント・戻り値・引数を次にする。

```ts
    /** `include=道筋` で結合する関連を、`fields[資源]=項目,項目` で返す列を選べる（docs/adr/0010-v3-include-and-fields.md） */
    @Get('/')
    @CacheControl(CACHE_CONTROL.TIMETABLE)
    async findManyByFilter(
        @Query() query: TripBlockFindManyByFilterQuery,
    ): Promise<TripBlockDetailsDto[] | Record<string, unknown>[]> {
        const result = await this.tripBlockV3Service.findManyByFilter({
            calendarId: query.calendarId,
            tripDirection: query.tripDirection,
            include: query.include,
            fields: query.fields,
        });

        return result;
    }
```

- [ ] **Step 8: service・query params の spec を書き換える**

`trip-block.v3.service.spec.ts`:
- `mockTripBlockQuery` の `findManyByFilterWithFields` を `findManyByFilterWithSelection` に改名する（spec の中のすべての参照）
- 「fields があれば許可リストで検めてから項目を絞った取得をする」の `toHaveBeenCalledWith` の第 2 引数を次にする

```ts
            {
                paths: new Set(['trips', 'trips.times']),
                fields: new Map([
                    ['trip', new Set(['tripNumber'])],
                    ['time', new Set(['stationId', 'arrivalTime'])],
                ]),
            },
```

- 同じ describe に次を足す

```ts
    it('include があれば木で検めてから関連を選んだ取得をする', async () => {
        mockTripBlockQuery.findManyByFilterWithSelection.mockResolvedValue([]);

        await service.findManyByFilter({
            calendarId: 'c1',
            tripDirection: 0,
            include: 'trips.tripClass',
        });

        expect(
            mockTripBlockQuery.findManyByFilterWithSelection,
        ).toHaveBeenCalledWith(
            { calendarId: 'c1', tripDirection: 0 },
            { paths: new Set(['trips', 'trips.tripClass']), fields: new Map() },
        );
    });

    it('木に無い道筋は 400', async () => {
        await expect(
            service.findManyByFilter({
                calendarId: 'c1',
                tripDirection: 0,
                include: 'trips.service',
            }),
        ).rejects.toThrow(BadRequestException);
    });
```

`trip-block-find-many-by-filter.query.spec.ts`: 既存の「fields の入れ子…」の it と同じ組み立て方で、次の 2 件を足す（`plainToInstance`＋`validate` の使い方は既存の it に合わせる）。
- `include: 'trips.times,trips.tripClass'` を受け取り、検証エラーが無く `query.include` がその文字列のまま
- `include: ['trips.times', 'trips.tripClass']` を受け取り、検証エラーが無い

- [ ] **Step 9: 古い部品を消し、確かめ用の it を消す**

```bash
git rm src/core/utils/sparse-fieldsets.ts src/core/utils/sparse-fieldsets.spec.ts src/libs/trip-block/usecase/trip-block-fieldsets.ts src/libs/trip-block/usecase/dtos/trip-block-sparse.dto.ts src/libs/trip-block/infrastructure/builders/trip-block-sparse.dto.builder.ts src/libs/trip-block/infrastructure/builders/trip-block-sparse.dto.builder.spec.ts
```

`trip-block-selection.spec.ts` から `TripBlockSparseDtoBuilder` の import と「古い builder と同じ」の `it.each` を消す。

`src/core/configs/express-settings.ts` の `sparse-fieldsets` に触れたコメントを、`include`・`fields`（docs/adr/0010-v3-include-and-fields.md）のためと読める文に直す（コードは変えない）。

`grep -rn "sparse-fieldsets\|SparseFieldsets\|TripBlockSparse\|trip-block-fieldsets\|findManyByFilterWithFields" src test` が 0 件であることを確かめる。

- [ ] **Step 10: 型・テストを確かめる**

Run（サンドボックスの外）: `npm run build`
Expected: エラーなし

Run（サンドボックスの外）: `npx vitest run src/core/utils/selection src/libs/trip-block`
Expected: PASS

- [ ] **Step 11: コミット**

```bash
git add -A src
git commit -m "feat: :sparkles: 列車ブロックの一覧で include を受け、fields を新しい部品に寄せる" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01FZB1eB3dTj4GQVxda71thf"
```

---

### Task 3: 運用表の trips（`GET /v3/operations/calendar/:calendarId/trips`）

**Files:**
- Create: `src/libs/calendar/usecase/calendar-selection-columns.ts`
- Create: `src/libs/operation/usecase/operation-with-trips-selection.ts`
- Modify: `src/libs/operation/infrastructure/queries/operation.query.ts`（`findManyWithTripsWithSelection` を足す）
- Modify: `src/libs/operation/infrastructure/queries/operation.query.spec.ts`
- Modify: `src/libs/operation/usecase/operation.v3.service.ts`（`findManyWithTrips`）と、その spec（`operation.v3.service.spec.ts` が無ければ作る）
- Modify: `src/libs/operation/presentation/operation.v3.controller.ts`（`findManyWithTrips`）

**Interfaces:**
- Consumes: Task 1 の部品、Task 2 の `TRIP_COLUMNS`・`TIME_COLUMNS`・`TRIP_OPERATION_LIST_COLUMNS`・`TRIP_CLASS_COLUMNS`・`OPERATION_COLUMNS`
- Produces:
  - `CALENDAR_COLUMNS`
  - `OPERATION_WITH_TRIPS_SELECTION_TREE`
  - `OperationQuery.findManyWithTripsWithSelection(params: { calendarId: string }, selection: Selection): Promise<Record<string, unknown>[]>`
  - `OperationV3Service.findManyWithTrips(params: { calendarId: string; include?: unknown; fields?: unknown }): Promise<OperationWithTripsDto[] | Record<string, unknown>[]>`

応答の形は今と同じ `[{ operation, trips }]`。`operation` は外せない（required）。`trips` は今の `tripOperationLists`（運用の区間）で、列車は `trips[].trip` にある。

- [ ] **Step 1: 列と木を書く**

`src/libs/calendar/usecase/calendar-selection-columns.ts`:

```ts
import { columnsOf } from '../../../core/utils/selection/selection-tree.js';

/** `fields[calendar]` で選べる列（docs/adr/0010-v3-include-and-fields.md） */
export const CALENDAR_COLUMNS = columnsOf(
    'id',
    'serviceId',
    'calendarName',
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'startDate',
    'endDate',
    'createdAt',
    'updatedAt',
);
```

`src/libs/operation/usecase/operation-with-trips-selection.ts`:

```ts
import { defineSelectionTree } from '../../../core/utils/selection/selection-tree.js';
import { CALENDAR_COLUMNS } from '../../calendar/usecase/calendar-selection-columns.js';
import { TRIP_CLASS_COLUMNS } from '../../trip-class/usecase/trip-class-selection-columns.js';
import {
    TIME_COLUMNS,
    TRIP_COLUMNS,
    TRIP_OPERATION_LIST_COLUMNS,
} from '../../trip/usecase/trip-selection-columns.js';
import { OPERATION_COLUMNS } from './operation-selection-columns.js';

/**
 * `GET /v3/operations/calendar/:calendarId/trips` の `include`・`fields` で選べる範囲
 * （docs/adr/0010-v3-include-and-fields.md）。`trips` は運用の区間（tripOperationLists）。
 */
export const OPERATION_WITH_TRIPS_SELECTION_TREE = defineSelectionTree({
    resource: null,
    columns: {},
    relations: {
        operation: {
            property: 'operation',
            many: false,
            required: true,
            resource: 'operation',
            // 全部入りの応答と同じく、id を operationId でも返せる
            columns: { ...OPERATION_COLUMNS, operationId: 'id' },
            alwaysKeys: ['id'],
            relations: {
                calendar: {
                    property: 'calendar',
                    many: false,
                    resource: 'calendar',
                    columns: CALENDAR_COLUMNS,
                    alwaysKeys: ['id'],
                },
            },
        },
        trips: {
            property: 'trips',
            many: true,
            resource: 'tripOperationList',
            columns: TRIP_OPERATION_LIST_COLUMNS,
            alwaysKeys: ['id'],
            relations: {
                trip: {
                    property: 'trip',
                    many: false,
                    resource: 'trip',
                    columns: TRIP_COLUMNS,
                    alwaysKeys: ['id'],
                    relations: {
                        tripClass: {
                            property: 'tripClass',
                            many: false,
                            resource: 'tripClass',
                            columns: TRIP_CLASS_COLUMNS,
                            alwaysKeys: ['id'],
                        },
                    },
                },
                startTime: {
                    property: 'startTime',
                    many: false,
                    resource: 'time',
                    columns: TIME_COLUMNS,
                    alwaysKeys: ['id'],
                },
                endTime: {
                    property: 'endTime',
                    many: false,
                    resource: 'time',
                    columns: TIME_COLUMNS,
                    alwaysKeys: ['id'],
                },
            },
        },
    },
});
```

- [ ] **Step 2: query の spec を書く**

`operation.query.spec.ts` の末尾に足す（import に `parseSelection` と `OPERATION_WITH_TRIPS_SELECTION_TREE` を足す）。

```ts
describe('OperationQuery - findManyWithTripsWithSelection', () => {
    let qb: any;
    let query: OperationQuery;

    const select = (raw: { include?: unknown; fields?: unknown }) =>
        parseSelection(raw, OPERATION_WITH_TRIPS_SELECTION_TREE)!;

    beforeEach(async () => {
        qb = {};
        for (const method of [
            'select',
            'addSelect',
            'leftJoin',
            'where',
            'orderBy',
            'addOrderBy',
        ]) {
            qb[method] = vi.fn().mockReturnValue(qb);
        }
        qb.getMany = vi.fn().mockResolvedValue([
            {
                id: 'op1',
                operationNumber: '54',
                calendarId: 'c1',
                tripOperationLists: [
                    {
                        id: 'tol1',
                        tripId: 't1',
                        nextTripOperationListId: null,
                        trip: { id: 't1', tripNumber: '6000', depotOut: true },
                        startTime: {
                            id: 'tm1',
                            stationId: 's1',
                            departureTime: '04:39:00',
                            arrivalTime: null,
                        },
                    },
                ],
            },
        ]);
        mockCreateQueryBuilder.mockReturnValue(qb);
        query = await buildQuery();
    });

    afterEach(() => vi.clearAllMocks());

    it('運用だけ（空の include）なら区間を結合せず、並べ替えもしない', async () => {
        const result = await query.findManyWithTripsWithSelection(
            { calendarId: 'c1' },
            select({ include: '', fields: { operation: 'operationNumber' } }),
        );

        expect(qb.select).toHaveBeenCalledWith([
            'operation.id',
            'operation.operationNumber',
        ]);
        expect(qb.where).toHaveBeenCalledWith(
            'operation.calendar_id = :calendarId',
            { calendarId: 'c1' },
        );
        expect(qb.leftJoin).not.toHaveBeenCalled();
        expect(qb.orderBy).not.toHaveBeenCalled();
        expect(result).toEqual([
            { operation: { id: 'op1', operationNumber: '54' } },
        ]);
    });

    it('時刻を返さなくても、区間は今と同じ出発 → 到着の時刻順', async () => {
        await query.findManyWithTripsWithSelection(
            { calendarId: 'c1' },
            select({ include: 'trips' }),
        );

        expect(qb.leftJoin).toHaveBeenCalledWith(
            'operation.tripOperationLists',
            'tripOperationLists',
        );
        expect(qb.leftJoin).toHaveBeenCalledWith(
            'tripOperationLists.startTime',
            'startTime',
        );
        expect(qb.leftJoin).toHaveBeenCalledWith(
            'tripOperationLists.endTime',
            'endTime',
        );
        expect(qb.orderBy).toHaveBeenCalledWith(
            'startTime.departureDays',
            'ASC',
            'NULLS LAST',
        );
        expect(qb.addOrderBy).toHaveBeenCalledWith(
            'startTime.departureTime',
            'ASC',
            'NULLS LAST',
        );
        expect(qb.addOrderBy).toHaveBeenCalledWith(
            'endTime.arrivalDays',
            'ASC',
            'NULLS LAST',
        );
        expect(qb.addOrderBy).toHaveBeenCalledWith(
            'endTime.arrivalTime',
            'ASC',
            'NULLS LAST',
        );
        // 時刻の列は選ばない
        expect(qb.addSelect).not.toHaveBeenCalledWith(
            expect.arrayContaining(['startTime.id']),
        );
        expect(qb.leftJoin).not.toHaveBeenCalledWith(
            'tripOperationLists.trip',
            'trip',
        );
    });

    it('列車と出発の時刻を挙げれば、指定の列だけで返す', async () => {
        const result = await query.findManyWithTripsWithSelection(
            { calendarId: 'c1' },
            select({
                include: 'trips.trip,trips.startTime',
                fields: {
                    operation: 'operationNumber',
                    tripOperationList: 'tripId',
                    trip: 'tripNumber,depotOut',
                    time: 'stationId,departureTime',
                },
            }),
        );

        expect(qb.addSelect).toHaveBeenCalledWith([
            'tripOperationLists.id',
            'tripOperationLists.tripId',
        ]);
        expect(qb.leftJoin).toHaveBeenCalledWith(
            'tripOperationLists.trip',
            'trip',
        );
        expect(qb.addSelect).toHaveBeenCalledWith([
            'trip.id',
            'trip.tripNumber',
            'trip.depotOut',
        ]);
        expect(qb.addSelect).toHaveBeenCalledWith([
            'startTime.id',
            'startTime.stationId',
            'startTime.departureTime',
        ]);
        expect(qb.leftJoin).not.toHaveBeenCalledWith(
            'trip.tripClass',
            'tripClass',
        );
        expect(result).toEqual([
            {
                operation: { id: 'op1', operationNumber: '54' },
                trips: [
                    {
                        id: 'tol1',
                        tripId: 't1',
                        trip: { id: 't1', tripNumber: '6000', depotOut: true },
                        startTime: {
                            id: 'tm1',
                            stationId: 's1',
                            departureTime: '04:39:00',
                        },
                    },
                ],
            },
        ]);
    });

    it('ダイヤと種別を挙げればそれぞれ結合する', async () => {
        await query.findManyWithTripsWithSelection(
            { calendarId: 'c1' },
            select({ include: 'operation.calendar,trips.trip.tripClass' }),
        );

        expect(qb.leftJoin).toHaveBeenCalledWith(
            'operation.calendar',
            'calendar',
        );
        expect(qb.leftJoin).toHaveBeenCalledWith('trip.tripClass', 'tripClass');
    });
});
```

- [ ] **Step 3: spec が落ちることを確かめる**

Run（サンドボックスの外）: `npx vitest run src/libs/operation/infrastructure/queries/operation.query.spec.ts`
Expected: FAIL（`findManyWithTripsWithSelection` が無い）

- [ ] **Step 4: query を書く**

`operation.query.ts` の `findManyWithTrips` のすぐ後ろに足す（import に `Selection` 型・`selectColumns`・`serializeSelection`・`OPERATION_WITH_TRIPS_SELECTION_TREE` を足す。パスは Task 2 の trip-block.query.ts と同じ深さ）。

```ts
    /**
     * `findManyWithTrips` と同じ条件で、`include`・`fields` で選んだ関連・列だけを返す
     * （docs/adr/0010-v3-include-and-fields.md）。区間の並びは返す列に関わらず時刻順のまま。
     */
    async findManyWithTripsWithSelection(
        params: { calendarId: string },
        selection: Selection,
    ): Promise<Record<string, unknown>[]> {
        const { calendarId } = params;
        const tree = OPERATION_WITH_TRIPS_SELECTION_TREE;
        const { operation, trips } = tree.relations;

        const qb = this.operationRepository
            .createQueryBuilder('operation')
            .select(selectColumns('operation', operation, selection))
            .where('operation.calendar_id = :calendarId', { calendarId });

        if (selection.paths.has('operation.calendar')) {
            qb.leftJoin('operation.calendar', 'calendar').addSelect(
                selectColumns(
                    'calendar',
                    operation.relations.calendar,
                    selection,
                ),
            );
        }
        if (selection.paths.has('trips')) {
            qb.leftJoin('operation.tripOperationLists', 'tripOperationLists')
                .addSelect(
                    selectColumns('tripOperationLists', trips, selection),
                )
                // 並べ替えに使うので、時刻を返さないときも結合だけはする
                .leftJoin('tripOperationLists.startTime', 'startTime')
                .leftJoin('tripOperationLists.endTime', 'endTime')
                .orderBy('startTime.departureDays', 'ASC', 'NULLS LAST')
                .addOrderBy('startTime.departureTime', 'ASC', 'NULLS LAST')
                .addOrderBy('endTime.arrivalDays', 'ASC', 'NULLS LAST')
                .addOrderBy('endTime.arrivalTime', 'ASC', 'NULLS LAST');

            if (selection.paths.has('trips.startTime')) {
                qb.addSelect(
                    selectColumns(
                        'startTime',
                        trips.relations.startTime,
                        selection,
                    ),
                );
            }
            if (selection.paths.has('trips.endTime')) {
                qb.addSelect(
                    selectColumns('endTime', trips.relations.endTime, selection),
                );
            }
            if (selection.paths.has('trips.trip')) {
                qb.leftJoin('tripOperationLists.trip', 'trip').addSelect(
                    selectColumns('trip', trips.relations.trip, selection),
                );
            }
            if (selection.paths.has('trips.trip.tripClass')) {
                qb.leftJoin('trip.tripClass', 'tripClass').addSelect(
                    selectColumns(
                        'tripClass',
                        trips.relations.trip.relations.tripClass,
                        selection,
                    ),
                );
            }
        }

        const models = await qb.getMany();
        return models.map((model) =>
            serializeSelection(
                { operation: model, trips: model.tripOperationLists },
                tree,
                selection,
            ),
        );
    }
```

- [ ] **Step 5: service・controller を書き換える**

`operation.v3.service.ts` の `findManyWithTrips`:

```ts
    /** `include`・`fields` があれば選んだ関連・列だけを返す（docs/adr/0010-v3-include-and-fields.md） */
    findManyWithTrips(params: {
        calendarId: string;
        include?: unknown;
        fields?: unknown;
    }): Promise<OperationWithTripsDto[] | Record<string, unknown>[]> {
        const { calendarId, include, fields } = params;
        const selection = parseSelection(
            { include, fields },
            OPERATION_WITH_TRIPS_SELECTION_TREE,
        );
        if (!selection) {
            return this.operationQuery.findManyWithTrips({ calendarId });
        }
        return this.operationQuery.findManyWithTripsWithSelection(
            { calendarId },
            selection,
        );
    }
```

（今の `findManyWithTrips` が `async` かどうか・既存のコメントは、そのファイルの書き方に合わせる。`parseSelection` が投げる 400 が Promise の reject になるよう、`async` にしておく。）

`operation.v3.controller.ts` の `findManyWithTrips`:

```ts
    /**
     * ダイヤ内の全運用を列車つきで返す（運用表用。運用ごとの /:id/trips を束ねる）。
     * `include`・`fields` で返す関連・列を選べる（docs/adr/0010-v3-include-and-fields.md）
     */
    @Get('/calendar/:calendarId/trips')
    @CacheControl(CACHE_CONTROL.TIMETABLE)
    async findManyWithTrips(
        @Param('calendarId') calendarId: string,
        @Query('include') include?: unknown,
        @Query('fields') fields?: unknown,
    ): Promise<OperationWithTripsDto[] | Record<string, unknown>[]> {
        const result = await this.operationV3Service.findManyWithTrips({
            calendarId,
            include,
            fields,
        });

        return result;
    }
```

- [ ] **Step 6: service の spec を書く**

`src/libs/operation/usecase/operation.v3.service.spec.ts` に（無ければ、`OperationQuery` と `ItinerarySegmentQuery` を `useValue` のモックで差し込んで作る。既存があればその組み立てを使う）次の 3 件を足す。
- 指定が無ければ `operationQuery.findManyWithTrips({ calendarId: 'c1' })` を呼び、`findManyWithTripsWithSelection` は呼ばない
- `include: 'trips.startTime'` なら `findManyWithTripsWithSelection({ calendarId: 'c1' }, { paths: new Set(['operation', 'trips', 'trips.startTime']), fields: new Map() })` を呼ぶ
- `fields: { user: 'password' }` なら `BadRequestException` で reject

- [ ] **Step 7: テストと型を確かめる**

Run（サンドボックスの外）: `npx vitest run src/libs/operation`
Expected: PASS

Run（サンドボックスの外）: `npm run build`
Expected: エラーなし

- [ ] **Step 8: コミット**

```bash
git add src/libs/calendar/usecase/calendar-selection-columns.ts src/libs/operation
git commit -m "feat: :sparkles: 運用表の列車つき運用で include・fields を受ける" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01FZB1eB3dTj4GQVxda71thf"
```

---

### Task 4: 運行系統の駅一覧（`GET /v3/services/:id/stations`）

**Files:**
- Create: `src/libs/service/usecase/service-selection-columns.ts`
- Create: `src/libs/route/usecase/route-selection-columns.ts`
- Create: `src/libs/station/usecase/station-selection-columns.ts`
- Create: `src/libs/service/usecase/service-stations-selection.ts`
- Modify: `src/libs/service/infrastructure/queries/service.query.ts`（計算を切り出し、`findOneStationsForServiceWithSelection` を足す）
- Modify: `src/libs/service/infrastructure/queries/service.query.spec.ts`
- Modify: `src/libs/service/usecase/service.v3.service.ts`（`findOneStations`）と、その spec（無ければ作る）
- Modify: `src/libs/service/presentation/service.v3.controller.ts`（`findOneStations`）

**Interfaces:**
- Consumes: Task 1 の部品
- Produces:
  - `SERVICE_COLUMNS`・`OPERATING_SYSTEM_COLUMNS`・`ROUTE_COLUMNS`・`ROUTE_STATION_LIST_COLUMNS`・`STATION_COLUMNS`・`STOP_COLUMNS`
  - `SERVICE_STATIONS_SELECTION_TREE`
  - `ServiceQuery.findOneStationsForServiceWithSelection(params: { serviceId: string }, selection: Selection): Promise<Record<string, unknown> | null>`
  - `ServiceV3Service.findOneStations(params: { serviceId: string; include?: unknown; fields?: unknown }): Promise<ServiceStationsDto | Record<string, unknown>>`

応答の形は今と同じ `{ service, stations }`。駅の並びの計算には運行系統・路線・路線の駅・始終点が要るので、それらは指定に関わらず結合する（返すかどうかだけを `include` で決める）。`stations` は外せない（required）。`stations[].routeStationLists(.route)`・`stations[].stops` は指定したときだけ結合する。`service` の下の駅（`service.operatingSystems.route.routeStationLists.station`）には関連を付けない（駅の関連は `stations` の側で取る）。

- [ ] **Step 1: 列を書き、DTO と照らす**

`src/libs/service/usecase/service-selection-columns.ts`:

```ts
import { columnsOf } from '../../../core/utils/selection/selection-tree.js';

/** `fields[service]` で選べる列（docs/adr/0010-v3-include-and-fields.md） */
export const SERVICE_COLUMNS = columnsOf(
    'id',
    'serviceName',
    'serviceDescription',
    'createdAt',
    'updatedAt',
);

/** `fields[operatingSystem]` で選べる列 */
export const OPERATING_SYSTEM_COLUMNS = columnsOf(
    'id',
    'serviceId',
    'routeId',
    'startRouteStationListId',
    'endRouteStationListId',
    'sequence',
);
```

`src/libs/route/usecase/route-selection-columns.ts`:

```ts
import { columnsOf } from '../../../core/utils/selection/selection-tree.js';

/** `fields[route]` で選べる列（docs/adr/0010-v3-include-and-fields.md） */
export const ROUTE_COLUMNS = columnsOf(
    'id',
    'agencyId',
    'routeNumber',
    'routeName',
    'routeDescription',
    'routeType',
    'routeUrl',
    'routeColor',
    'routeTextColor',
    'createdAt',
    'updatedAt',
);

/** `fields[routeStationList]` で選べる列 */
export const ROUTE_STATION_LIST_COLUMNS = columnsOf(
    'id',
    'routeId',
    'stationId',
    'stationSequence',
    'stationNumbering',
);
```

`src/libs/station/usecase/station-selection-columns.ts`:

```ts
import { columnsOf } from '../../../core/utils/selection/selection-tree.js';

/** `fields[station]` で選べる列（docs/adr/0010-v3-include-and-fields.md） */
export const STATION_COLUMNS = columnsOf(
    'id',
    'stationName',
    'stationSubname',
    'stationType',
    'stationDescription',
    'stationLatlng',
    'stationUrl',
    'wheelchairBoarding',
    'createdAt',
    'updatedAt',
);

/** `fields[stop]` で選べる列 */
export const STOP_COLUMNS = columnsOf(
    'id',
    'stationId',
    'stopName',
    'stopDescription',
    'stopLatlng',
    'zoneId',
    'createdAt',
    'updatedAt',
);
```

この 6 つの一覧は、本番の全部入りの応答に出ている項目から作った。今の DTO（`ServiceDetailsDto`・`OperatingSystemDetailsDto`（名前は service/route の usecase/dtos を探す）・`RouteDetailsDto`・`RouteStationListDetailsDto`・`StationDetailsDto`・`StopDetailsDto`）の `@Expose()` の項目と照らし、
- 一覧にあって DTO に無い項目があれば、一覧から消す
- DTO に `@Transform` が付いた項目、または DTO の項目名とモデルのプロパティ名が違う項目があれば、手を止めて報告に書く（DONE_WITH_CONCERNS）。一覧はそのまま進めてよい

- [ ] **Step 2: 木を書く**

`src/libs/service/usecase/service-stations-selection.ts`:

```ts
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
```

- [ ] **Step 3: query の spec を書く**

`service.query.spec.ts` の末尾に足す（import に `parseSelection` と `SERVICE_STATIONS_SELECTION_TREE` を足す）。既存の `service`・`station()`・`rsl()`・`buildQuery` をそのまま使う。`chain()` が返す qb を後から見られるよう、次の helper を足す。

```ts
async function buildQueryWithChain(
    result: unknown,
): Promise<{ query: ServiceQuery; qb: Record<string, ReturnType<typeof vi.fn>> }> {
    const qb = chain(result) as Record<string, ReturnType<typeof vi.fn>>;
    const module: TestingModule = await Test.createTestingModule({
        providers: [
            ServiceQuery,
            {
                provide: getRepositoryToken(ServiceModel),
                useValue: { createQueryBuilder: () => qb },
            },
            { provide: getEntityManagerToken(DataSourceConfig), useValue: {} },
        ],
    }).compile();
    return { query: module.get(ServiceQuery), qb };
}

describe('ServiceQuery.findOneStationsForServiceWithSelection', () => {
    const select = (raw: { include?: unknown; fields?: unknown }) =>
        parseSelection(raw, SERVICE_STATIONS_SELECTION_TREE)!;

    it('空の include: 駅だけを全部入りと同じ並びで返し、service のキーも駅の関連の結合も無い', async () => {
        const { query, qb } = await buildQueryWithChain(service);

        const result = await query.findOneStationsForServiceWithSelection(
            { serviceId: 'svc' },
            select({ include: '' }),
        );

        expect(result).toEqual({
            stations: [
                { id: 'A', stationName: 'A' },
                { id: 'B', stationName: 'B' },
                { id: 'D', stationName: 'D' },
                { id: 'C', stationName: 'C' },
            ],
        });
        // 並びの計算に要る結合は常にする
        expect(qb.leftJoinAndSelect).toHaveBeenCalledWith(
            'operatingSystems.startRouteStationList',
            'startRSL',
        );
        expect(qb.leftJoinAndSelect).not.toHaveBeenCalledWith(
            'station.routeStationLists',
            'stationRouteStationLists',
        );
        expect(qb.leftJoinAndSelect).not.toHaveBeenCalledWith(
            'station.stops',
            'stops',
        );
    });

    it('駅の路線とのりばを挙げればそれぞれ結合する', async () => {
        const { query, qb } = await buildQueryWithChain(service);

        await query.findOneStationsForServiceWithSelection(
            { serviceId: 'svc' },
            select({ include: 'stations.routeStationLists.route,stations.stops' }),
        );

        expect(qb.leftJoinAndSelect).toHaveBeenCalledWith(
            'station.routeStationLists',
            'stationRouteStationLists',
        );
        expect(qb.leftJoinAndSelect).toHaveBeenCalledWith(
            'stationRouteStationLists.route',
            'stationRoute',
        );
        expect(qb.leftJoinAndSelect).toHaveBeenCalledWith(
            'station.stops',
            'stops',
        );
    });

    it('service を挙げれば、指定の列で返す', async () => {
        const { query } = await buildQueryWithChain(service);

        const result = await query.findOneStationsForServiceWithSelection(
            { serviceId: 'svc' },
            select({
                include: 'service',
                fields: { service: 'serviceName', station: '' },
            }),
        );

        expect(result).toEqual({
            service: { id: 'svc' },
            stations: [{ id: 'A' }, { id: 'B' }, { id: 'D' }, { id: 'C' }],
        });
    });

    it('運行系統が見つからなければ null', async () => {
        const { query } = await buildQueryWithChain(null);
        await expect(
            query.findOneStationsForServiceWithSelection(
                { serviceId: 'none' },
                select({ include: '' }),
            ),
        ).resolves.toBeNull();
    });
});
```

- [ ] **Step 4: spec が落ちることを確かめる**

Run（サンドボックスの外）: `npx vitest run src/libs/service/infrastructure/queries/service.query.spec.ts`
Expected: FAIL（`findOneStationsForServiceWithSelection` が無い）。既存の 4 件は PASS のまま

- [ ] **Step 5: query を書き換える**

`service.query.ts`:
1. `findOneStationsForService` の中の「`if (!service) return null;` の次の行から、`stations` を作り終えるまで」（`const pickedRouteStationLists` から `stations.push(...)` の for 文の終わりまで）を、そのまま private メソッド `#pickStations(service: ServiceModel): StationModel[]` に移す。中身は 1 文字も変えない（`return stations;` を末尾に足すだけ）。
2. 結合のうち、並びの計算に要るものを private メソッドにまとめる。

```ts
    /** 駅の並びの計算に要る結合（運行系統・路線・路線の駅・始終点） */
    #stationsForServiceQuery(serviceId: string) {
        return this.serviceRepository
            .createQueryBuilder('service')
            .leftJoinAndSelect('service.operatingSystems', 'operatingSystems')
            .leftJoinAndSelect('operatingSystems.route', 'route')
            .leftJoinAndSelect('route.routeStationLists', 'routeStationLists')
            .leftJoinAndSelect('routeStationLists.station', 'station')
            .leftJoinAndSelect(
                'operatingSystems.startRouteStationList',
                'startRSL',
            )
            .leftJoinAndSelect(
                'operatingSystems.endRouteStationList',
                'endRSL',
            )
            .where('service.id = :serviceId', { serviceId })
            .orderBy('operatingSystems.sequence', 'ASC')
            .addOrderBy('routeStationLists.stationSequence', 'ASC');
    }
```

3. `findOneStationsForService` を次にする（結合と応答は今と同じ）。

```ts
    async findOneStationsForService(params: {
        serviceId: string;
    }): Promise<ServiceStationsDto | null> {
        const service = await this.#stationsForServiceQuery(params.serviceId)
            .leftJoinAndSelect(
                'station.routeStationLists',
                'stationRouteStationLists',
            )
            .leftJoinAndSelect('stationRouteStationLists.route', 'stationRoute')
            .leftJoinAndSelect('station.stops', 'stops')
            .getOne();

        if (!service) return null;

        const stations = this.#pickStations(service);
        return ServiceStationsDtoBuilder.buildFromModel({ service, stations });
    }
```

4. 新しいメソッドを足す（import に `Selection` 型・`serializeSelection`・`SERVICE_STATIONS_SELECTION_TREE` を足す）。

```ts
    /**
     * `findOneStationsForService` と同じ並びで、`include`・`fields` で選んだ関連・列だけを返す
     * （docs/adr/0010-v3-include-and-fields.md）。並びの計算に要る結合は常にする。
     */
    async findOneStationsForServiceWithSelection(
        params: { serviceId: string },
        selection: Selection,
    ): Promise<Record<string, unknown> | null> {
        const qb = this.#stationsForServiceQuery(params.serviceId);
        if (selection.paths.has('stations.routeStationLists')) {
            qb.leftJoinAndSelect(
                'station.routeStationLists',
                'stationRouteStationLists',
            );
        }
        if (selection.paths.has('stations.routeStationLists.route')) {
            qb.leftJoinAndSelect(
                'stationRouteStationLists.route',
                'stationRoute',
            );
        }
        if (selection.paths.has('stations.stops')) {
            qb.leftJoinAndSelect('station.stops', 'stops');
        }

        const service = await qb.getOne();
        if (!service) return null;

        const stations = this.#pickStations(service);
        return serializeSelection(
            { service, stations },
            SERVICE_STATIONS_SELECTION_TREE,
            selection,
        );
    }
```

- [ ] **Step 6: service・controller を書き換える**

`service.v3.service.ts` の `findOneStations`:

```ts
    /** `include`・`fields` があれば選んだ関連・列だけを返す（docs/adr/0010-v3-include-and-fields.md） */
    async findOneStations(params: {
        serviceId: string;
        include?: unknown;
        fields?: unknown;
    }): Promise<ServiceStationsDto | Record<string, unknown>> {
        const { serviceId, include, fields } = params;
        const selection = parseSelection(
            { include, fields },
            SERVICE_STATIONS_SELECTION_TREE,
        );
        const result = selection
            ? await this.serviceQuery.findOneStationsForServiceWithSelection(
                  { serviceId },
                  selection,
              )
            : await this.serviceQuery.findOneStationsForService({ serviceId });

        if (!result) {
            throw new NotFoundException(
                `Service with ID "${serviceId}" not found.`,
            );
        }

        return result;
    }
```

`service.v3.controller.ts` の `findOneStations`（`Query` は import 済み）:

```ts
    /** `include`・`fields` で返す関連・列を選べる（docs/adr/0010-v3-include-and-fields.md） */
    @Get('/:id/stations')
    @CacheControl(CACHE_CONTROL.MASTER)
    async findOneStations(
        @Param('id') serviceId: string,
        @Query('include') include?: unknown,
        @Query('fields') fields?: unknown,
    ): Promise<ServiceStationsDto | Record<string, unknown>> {
        const result = await this.serviceV3Service.findOneStations({
            serviceId,
            include,
            fields,
        });

        return result;
    }
```

- [ ] **Step 7: service の spec を書く**

`src/libs/service/usecase/service.v3.service.spec.ts` に（無ければ `ServiceQuery` を `useValue` のモックで差し込んで作る）次の 4 件を足す。
- 指定が無ければ `findOneStationsForService({ serviceId: 'svc' })` を呼ぶ
- `include: ''` なら `findOneStationsForServiceWithSelection({ serviceId: 'svc' }, { paths: new Set(['stations']), fields: new Map() })` を呼ぶ
- 選んだ取得が null なら `NotFoundException`
- `include: 'stations.service'` なら `BadRequestException`

- [ ] **Step 8: テストと型を確かめる**

Run（サンドボックスの外）: `npx vitest run src/libs/service`
Expected: PASS（既存の駅の並びの 4 件を含む）

Run（サンドボックスの外）: `npm run build`
Expected: エラーなし

- [ ] **Step 9: コミット**

```bash
git add src/libs/service src/libs/route/usecase/route-selection-columns.ts src/libs/station/usecase/station-selection-columns.ts
git commit -m "feat: :sparkles: 運行系統の駅一覧で include・fields を受ける" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01FZB1eB3dTj4GQVxda71thf"
```

---

### Task 5: 文書（ADR-0010・ADR-0002・refactor-instructions）と全体の確かめ

**Files:**
- Create: `docs/adr/0010-v3-include-and-fields.md`
- Modify: `docs/adr/0002-v3-sparse-fieldsets.md`（ステータス）
- Modify: `docs/refactor-instructions.md`（4-A の例外）

- [ ] **Step 1: ADR-0010 を書く**

`docs/adr/0010-v3-include-and-fields.md`:

```markdown
# ADR-0010: v3 の読み取りの口で結合（include）と列（fields）を選べるようにする

- **日時**: 2026-10-24
- **Agent**: claude-opus-5-5
- **ステータス**: 採用済み
- **ブランチ**: feat/v3-include-fields
- **設計**: docs/superpowers/specs/2026-10-24-v3-include-fields-design.md

---

## 背景

- ADR-0002 で trip-blocks に `fields`（列の選択）を足した。名前を挙げた資源の関連だけを結合する決まりで、結合と列を 1 つの指定で兼ねていた。
- 本番の実測（2026-10-24・Lambda 1769MB）で、運用表の trips は 3.67MB・711ms、運行系統の駅一覧は 636KB（うち使われていない `service` が 384KB）を返していた。遅さは DB でなく Lambda の中のエンティティの組み立てにある。
- 外部公開（M4）を控えており、使う側が要る関連と列だけを取れる口にしたい。指定が無いときの応答は変えない。
- `docs/refactor-instructions.md` 4-A は「任意 join は実装しない」としていた。

## 決定

1. **`include` と `fields` を分ける（JSON:API の書き方に倣う）。**
   - `include=trips.startTime,trips.endTime`: 応答のキーの道筋。子を挙げれば親も付く。空なら関連を結合しない。
   - `fields[資源]=項目,項目`: 資源ごとの列。`include` と併せたときは列だけを絞る。
   - どちらも無ければ今の全部入り。`fields` だけなら ADR-0002 の動き（名前を挙げた資源を結合・親が欠ければ 400・常に結合する関連で名前の無いものは ID だけ）を保つ。
2. **口ごとに「選択の木」を宣言する**（`src/core/utils/selection/`）。木は応答の形を表し、選べる関連・列・常に返す ID・外せない関連（required）をここで決める。木に無い指定は 400。列は今の全部入りの応答に出ている項目に限る。
3. **指定があるときだけ軽い道を通る。** 各 query が選ばれた関連だけを結合し、選ばれた列（と主キー）だけを SELECT し、DTO builder を通さず木に沿って応答を組む。値が null の項目は省く。
4. **適用の順**: PR 1 で部品と trip-blocks・運用表の trips・運行系統の駅一覧。残りの v3 の読み取りの口は PR 2・PR 3 で入れる（関連の木を持つ口は `include`・`fields`、計算した形や結合の無い口は `fields` だけ）。
5. ADR-0002 は本 ADR で一部置き換える（`fields` の書き方は同じ。部品は `sparse-fieldsets.ts` から `selection/` に移った）。

## 結果

- 使う側は要る関連と列だけを取れる。結合・SELECT・組み立て・転送量がそろって減る。
- 何を選べるかは木で明示されるので、v3 の「明示的な口」の狙いは保たれる。
- 代わりに、指定したときの応答の型は「どの項目も省かれうる」前提になる（ADR-0002 と同じ）。
- 駅一覧は並びの計算に運行系統・路線の駅が要るので、`service` を外しても SQL の結合は残る（返す量だけが減る）。

## 検討した代案

- **口ごとに `if` で結合を手書きし、許可リストと親子の関係も口ごとに持つ（ADR-0002 の書き方を写す）**: 32 本で 3 か所ずつ書くことになり、食い違う。
- **いつも全部結合し、返すときに削る**: 転送量しか減らず、遅さの元（組み立て）が残る。
- **汎用の `applySelection` が木から結合も書く**: 応答の入れ物と SQL の別名が 1 対 1 でない口（運用表・駅一覧）に合わない。結合は各 query が明示的に書き、列の一覧だけを部品で作る。
```

- [ ] **Step 2: ADR-0002 と refactor-instructions を直す**

`docs/adr/0002-v3-sparse-fieldsets.md` の `- **ステータス**: 採用済み` を次にする。

```markdown
- **ステータス**: 採用済み（2026-10-24 に ADR-0010 で一部置き換え。部品は `src/core/utils/selection/`）
```

`docs/refactor-instructions.md` 4-A の例外の行（`  - 例外（2026-09-26 追記）: …`）の次に足す。

```markdown
  - 例外（2026-10-24 追記）: 結合する関連の選択 `include` と列の選択 `fields` は `docs/adr/0010-v3-include-and-fields.md` に従って実装してよい。選べる範囲は口ごとの選択の木（`src/core/utils/selection/`）に限る。`sparse-fieldsets.ts` は `selection/` に置き換わった。
```

- [ ] **Step 3: 全体を確かめる**

Run（サンドボックスの外）: `npm run build`
Expected: エラーなし

Run（サンドボックスの外）: `npx vitest run`
Expected: 全件 PASS

Run（サンドボックスの外）: `npm run lint`
Expected: エラーなし。lint が書き換えたファイルがあれば、差分を見て整形だけであることを確かめる

- [ ] **Step 4: コミット**

```bash
git add docs/adr/0010-v3-include-and-fields.md docs/adr/0002-v3-sparse-fieldsets.md docs/refactor-instructions.md
git diff --cached --stat
git commit -m "docs: :memo: include と fields の ADR を書き、ADR-0002 と移行の指示を直す" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01FZB1eB3dTj4GQVxda71thf"
```

（lint の整形が出ていれば、別に `style: :lipstick: …` でコミットする。）

---

### Task 6: 手元の API で本番と突き合わせる（controller が行う）

実装役には渡さない。controller が行う。

- [ ] **Step 1: 手元の API を今のブランチで動かす**: `docker logs` で `error TS` が無いことを確かめ、古ければ `docker restart`（memory: project_local_api_stale_watch_build）
- [ ] **Step 2: 指定なしの応答が本番（v4.1.1）と同じ**: 3 本（`/v3/trip-blocks?calendarId=…&tripDirection=0`・`/v3/operations/calendar/…/trips`・`/v3/services/…/stations`）を手元と本番で取り、本文が同じであることを確かめる（trip-blocks の指定なしは 6MB 超で本番が 500 になるなら、手元の 200 と件数だけ見る）
- [ ] **Step 3: 全線時刻表の `fields` だけの応答が本番と同じ**: `response-anatomy.mjs` の `ALL_LINE_FIELDS` の URL を手元と本番で取り、本文が同じ
- [ ] **Step 4: 指定したときの大きさと待ち時間**: 運用表を `include=trips.trip,trips.startTime,trips.endTime` と運用表で使う列、駅一覧を `include=`（または client が使う関連）で取り、大きさと待ち時間を指定なしと比べて記録する（`.context/` に残す）
- [ ] **Step 5: 400 の確かめ**: 木に無い道筋・資源・項目、結合の無い資源の `fields` が 400 で日本語の文言になる
```
