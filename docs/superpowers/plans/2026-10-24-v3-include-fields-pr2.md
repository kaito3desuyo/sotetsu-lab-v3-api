# v3 include・fields PR 2（運用・目撃・編成）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 運用・目撃・編成の読み取りの口に `include`・`fields` を、read-model の口に `fields` だけを足し、trip-blocks の崩れた `fields` を 422 でなく 400 にそろえる。

**Architecture:** PR 1 の部品（`src/core/utils/selection/`）をそのまま使う。関連の木を持つ口のうち、エンティティから組める口（運用の `from/to`・`:id/trips`、編成の 2 本）は PR 1 と同じく SQL の列と結合を絞る。計算した DTO を返す口（目撃の `from/to`、運用の read-model 4 本、時刻断面 4 本）は、今の DTO を作ったあとで木に沿って削る（SQL は今のまま）。read-model の口は新しい `parseFieldsOnly` で読み、`include` は 400、`fields` に挙げた資源だけを削り、挙げない資源は全項目で返す。

**Tech Stack:** NestJS 12・TypeORM 1.x（`createQueryBuilder`）・Vitest＋SWC・TypeScript strict・ESM

**Spec:** `docs/superpowers/specs/2026-10-24-v3-include-fields-design.md`（PR 1 の ADR: `docs/adr/0010-v3-include-and-fields.md`）

## Global Constraints

- 指定（`include`・`fields`）が無いときの応答は 1 バイトも変えない。既存の query・builder・DTO の全部入りの道には手を入れない（目撃の `from/to` は本体を private メソッドへ中身を変えずに移すだけ、運用 `:id/trips` は PR 1 の選択の道を private の組み立てに切り出すだけ）
- 400 の文言は日本語。PR 1 の `parseSelection` の文言をそのまま使う。新しい文言は `この口は include を指定できない`（PR 1 に既にある文言と同じ）だけ
- ESM: 相対 import には `.js` を付ける。`src/…` の絶対 import は使わない
- query は `createQueryBuilder` だけで書く（`find`・`findOne` を新たに使わない）
- TypeScript strict。`as any`・`@ts-ignore` は使わない（spec の中の既存の書き方は除く）
- lodash は使わない
- テストは SWC を使うので、Claude Code のサンドボックスの外で流す（`npx vitest run <パス> --reporter=default`）
- コミット: Conventional Commits＋絵文字（例 `feat: :sparkles: …`）。ドメイン名は日本語（operation → 運用、operation-sighting → 目撃情報、formation → 編成、trip-block → 列車ブロック）。GPG 署名があるのでサンドボックスの外で `git commit`。本文の末尾に次の 2 行

  ```
  Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01FZB1eB3dTj4GQVxda71thf
  ```
- コメントの量と言葉づかいは周りのコードに合わせる（日本語・短く）
- ブランチは `feat/v3-include-fields-pr2`。push・PR は作らない（controller が行う）
- 資源ごとの列の定数は、その資源のドメインの `usecase/*-selection-columns.ts` に置く。1 つの木の中で同じ資源の `columns` は同じにする（`defineSelectionTree` が食い違いを投げる）
- DTO を削る木では、別名の列（`operationId`・`formationId`）は DTO の同じ名前のプロパティを指す（`operationId: 'operationId'`）。DTO にその項目が無ければ値が undefined で省かれ、今の応答に無い項目を足さない。エンティティから組む木では PR 1 と同じく `operationId: 'id'`・`formationId: 'id'`

## Review Focus

1. **read-model で `fields` に挙げない資源**: `fields[trip]=tripNumber` だけなら、列車だけが削られ、運用・時刻は全項目のまま。→ Task 1 の spec、Task 6 の service spec
2. **read-model に `include` を付けた**: 値が空（`include=`）でも 400 `この口は include を指定できない`。→ Task 1 の spec
3. **引き継いだ目撃の印**: `fields[operationSighting]=sightingTime` でも `sightedAsOperation` は全項目で返る。→ Task 5 の service spec
4. **運用の `from/to` でダイヤを返さない**: 期間の絞り込みのためダイヤは結合し、列は選ばない。→ Task 3 の query spec
5. **時刻断面をまとめて返す口**: 選択があってもキー（運用番号）の並びと集合は今と同じ。→ Task 7 の service spec

---

## File Structure

| ファイル | 役目 |
|---|---|
| Modify `src/core/utils/selection/parse-selection.ts`（＋spec） | `parseFieldsOnly` を足す |
| Modify trip-block の `params/trip-block-find-many-by-filter.query.ts`（＋spec）・service spec | 崩れた `fields` を 400 に |
| Create `src/libs/operation/usecase/operations-by-period-selection.ts` | 運用 `from/to` の木 |
| Modify operation の query・service・controller と spec | 運用 `from/to`・`:id/trips` |
| Create `src/libs/formation/usecase/formation-selection-columns.ts` | formation・vehicleFormation の列 |
| Create `src/libs/vehicle/usecase/vehicle-selection-columns.ts` | vehicle の列 |
| Create `src/libs/agency/usecase/agency-selection-columns.ts` | agency の列 |
| Create `src/libs/formation/usecase/formation-selection.ts` | 編成 2 本の木 |
| Modify formation の query・service・controller と spec | 編成 2 本 |
| Create `src/libs/operation-sighting/usecase/operation-sighting-selection-columns.ts` | 目撃・無効化・管理記録・目撃されたときの運用の列 |
| Create `src/libs/operation-sighting/usecase/operation-sightings-by-period-selection.ts` | 目撃 `from/to` の木 |
| Modify operation-sighting の service・controller と spec | 目撃 `from/to`・時刻断面 4 本 |
| Create `src/libs/operation/usecase/operation-read-model-selection.ts` | 現在位置・つながり・次の運用の候補の木 |
| Create `src/libs/operation-sighting/usecase/operation-sighting-time-cross-section-selection.ts` | 時刻断面の木 |
| Modify `docs/adr/0010-v3-include-and-fields.md` | PR 2 の決めごと |

---

### Task 1: `parseFieldsOnly`（read-model の口の読み方）

**Files:**
- Modify: `src/core/utils/selection/parse-selection.ts`
- Test: `src/core/utils/selection/parse-selection.spec.ts`

**Interfaces:**
- Consumes: PR 1 の `Selection`・`SelectionTree`・内部の `flattenRelations`・`parseFields`
- Produces: `function parseFieldsOnly(query: { include?: unknown; fields?: unknown }, tree: SelectionTree): Selection | undefined`

決まり:
- `include` が undefined・null でなければ（空文字でも）400 `この口は include を指定できない`
- `fields` が無ければ undefined（全部入りのまま）
- `fields` の検めは `parseFields` と同じ（文言も同じ）
- `paths` は木のすべての関連の道筋、`fields` は挙げた資源だけ。挙げない資源は全項目（`parseSelection` の fields だけのときの「required の名前の無い資源は ID だけ」は使わない）

- [ ] **Step 1: spec を足す**

`src/core/utils/selection/parse-selection.spec.ts` の末尾に足す（import に `parseFieldsOnly` を加える）:

```ts
describe('parseFieldsOnly', () => {
    const tree = defineSelectionTree({
        resource: null,
        columns: {},
        relations: {
            operation: {
                property: 'operation',
                many: false,
                resource: 'operation',
                columns: columnsOf('id', 'operationNumber'),
                alwaysKeys: ['id'],
            },
            current: {
                property: 'current',
                many: false,
                resource: 'tripOperationList',
                columns: columnsOf('id', 'tripId'),
                alwaysKeys: ['id'],
                relations: {
                    trip: {
                        property: 'trip',
                        many: false,
                        resource: 'trip',
                        columns: columnsOf('tripNumber', 'depotIn'),
                        alwaysKeys: ['id'],
                    },
                },
            },
        },
    });

    it('fields が無ければ undefined', () => {
        expect(parseFieldsOnly({}, tree)).toBeUndefined();
    });

    it('挙げた資源だけを削り、関連はすべて返す', () => {
        expect(parseFieldsOnly({ fields: { trip: 'tripNumber' } }, tree)).toEqual({
            paths: new Set(['operation', 'current', 'current.trip']),
            fields: new Map([['trip', new Set(['tripNumber'])]]),
        });
    });

    it('include は空でも 400', () => {
        expect(() => parseFieldsOnly({ include: '' }, tree)).toThrow(
            new BadRequestException('この口は include を指定できない'),
        );
        expect(() =>
            parseFieldsOnly({ include: 'current', fields: { trip: 'tripNumber' } }, tree),
        ).toThrow(BadRequestException);
    });

    it('fields の検めは parseSelection と同じ', () => {
        expect(() => parseFieldsOnly({ fields: 'tripNumber' }, tree)).toThrow(
            new BadRequestException('fields は fields[資源]=項目,項目 の形で指定する'),
        );
        expect(() => parseFieldsOnly({ fields: { user: 'password' } }, tree)).toThrow(
            new BadRequestException('fields に指定できない資源: user'),
        );
        expect(() => parseFieldsOnly({ fields: { trip: 'password' } }, tree)).toThrow(
            new BadRequestException('fields[trip] に指定できない項目: password'),
        );
    });
});
```

（spec の先頭の import に `BadRequestException`・`defineSelectionTree`・`columnsOf` が無ければ足す）

- [ ] **Step 2: 落ちることを確かめる**

Run: `npx vitest run src/core/utils/selection/parse-selection.spec.ts --reporter=default`
Expected: FAIL（`parseFieldsOnly` が無い）

- [ ] **Step 3: 実装する**

`parse-selection.ts` の `parseSelection` の後ろに足す:

```ts
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
```

- [ ] **Step 4: 通ることを確かめる**

Run: `npx vitest run src/core/utils/selection/ --reporter=default`
Expected: PASS

- [ ] **Step 5: コミット**

```bash
git add src/core/utils/selection/parse-selection.ts src/core/utils/selection/parse-selection.spec.ts
git commit -m "feat: :sparkles: read-model の口の fields を読む parseFieldsOnly を足す"
```

---

### Task 2: trip-blocks の崩れた `fields` を 400 にする

**Files:**
- Modify: `src/libs/trip-block/usecase/params/trip-block-find-many-by-filter.query.ts`
- Test: `src/libs/trip-block/usecase/params/trip-block-find-many-by-filter.query.spec.ts`、`src/libs/trip-block/usecase/trip-block.v3.service.spec.ts`

今は DTO の `@IsObject()` が ValidationPipe で 422 を返す。`include` と同じく形の検めを `parseSelection` に任せ、400 にする。

- [ ] **Step 1: spec を書き換える**

`trip-block-find-many-by-filter.query.spec.ts` の `it('fields が入れ子でなければ検証エラー', …)` を次に置き換える:

```ts
    it('fields の形はここで検めない（サービスの parseSelection が 400 を返す）', async () => {
        const query = plainToInstance(TripBlockFindManyByFilterQuery, {
            calendarId: 'cal-1',
            tripDirection: '0',
            fields: 'tripNumber',
        });

        const errors = await validate(query, validatorOptions);

        expect(errors).toHaveLength(0);
        expect(query.fields).toBe('tripNumber');
    });
```

`trip-block.v3.service.spec.ts` の `it('include が崩れた形（オブジェクト）なら 400', …)` の後ろに足す:

```ts
    it('fields が崩れた形（文字列）なら 400', async () => {
        await expect(
            service.findManyByFilter({
                calendarId: 'c1',
                tripDirection: 0,
                fields: 'tripNumber',
            }),
        ).rejects.toThrow(
            new BadRequestException(
                'fields は fields[資源]=項目,項目 の形で指定する',
            ),
        );
    });
```

- [ ] **Step 2: 落ちることを確かめる**

Run: `npx vitest run src/libs/trip-block/usecase/ --reporter=default`
Expected: DTO の spec が FAIL（`@IsObject` のエラーが出る）。service の spec は既に PASS してよい

- [ ] **Step 3: 実装する**

`trip-block-find-many-by-filter.query.ts` の `fields` を次にする（`IsObject` の import は使わなくなるので消す）:

```ts
    /**
     * 返す項目の選択 `fields[資源]=項目,項目`（docs/adr/0010-v3-include-and-fields.md）。
     * 形と中身の検めは include と同じくサービスの parseSelection で行い、崩れていれば 400 を返す。
     */
    @IsOptional()
    fields?: unknown;
```

controller が `fields: query.fields` を渡している型が合わなければ、service の引数は既に `unknown` なのでそのまま通る。

- [ ] **Step 4: 通ることを確かめる**

Run: `npx vitest run src/libs/trip-block/ --reporter=default`
Expected: PASS

- [ ] **Step 5: コミット**

```bash
git add src/libs/trip-block/usecase/params/trip-block-find-many-by-filter.query.ts src/libs/trip-block/usecase/params/trip-block-find-many-by-filter.query.spec.ts src/libs/trip-block/usecase/trip-block.v3.service.spec.ts
git commit -m "fix: :bug: 列車ブロックの崩れた fields も 400 にする"
```

---

### Task 3: 運用の `from/to`・`:id/trips`

**Files:**
- Create: `src/libs/operation/usecase/operations-by-period-selection.ts`
- Modify: `src/libs/operation/infrastructure/queries/operation.query.ts`
- Modify: `src/libs/operation/usecase/operation.v3.service.ts`
- Modify: `src/libs/operation/presentation/operation.v3.controller.ts`
- Test: `src/libs/operation/infrastructure/queries/operation.query.spec.ts`、`src/libs/operation/usecase/operation.v3.service.spec.ts`

**Interfaces:**
- Consumes: `OPERATION_COLUMNS`・`CALENDAR_COLUMNS`・`OPERATION_WITH_TRIPS_SELECTION_TREE`（PR 1）
- Produces:
  - `OPERATIONS_BY_PERIOD_SELECTION_TREE`
  - `OperationQuery.findManyBySpecificPeriodWithSelection(params: { start: string; end: string }, selection: Selection): Promise<Record<string, unknown>[]>`
  - `OperationQuery.findOneWithTripsWithSelection(params: { operationId: string }, selection: Selection): Promise<Record<string, unknown> | null>`

- [ ] **Step 1: 木を作る**

`src/libs/operation/usecase/operations-by-period-selection.ts`:

```ts
import { defineSelectionTree } from '../../../core/utils/selection/selection-tree.js';
import { CALENDAR_COLUMNS } from '../../calendar/usecase/calendar-selection-columns.js';
import { OPERATION_COLUMNS } from './operation-selection-columns.js';

/** `GET /v3/operations/from/:start/to/:end` の `include`・`fields` で選べる範囲（docs/adr/0010-v3-include-and-fields.md） */
export const OPERATIONS_BY_PERIOD_SELECTION_TREE = defineSelectionTree({
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
});
```

- [ ] **Step 2: query の spec を書く**

`operation.query.spec.ts` の末尾に足す（import に `OPERATIONS_BY_PERIOD_SELECTION_TREE` を加える。`dayjs` の `customParseFormat` が spec で extend されていなければ、`formation.query.spec.ts` と同じく先頭で extend する）:

```ts
describe('OperationQuery - findManyBySpecificPeriodWithSelection', () => {
    let qb: any;
    let query: OperationQuery;

    beforeEach(async () => {
        qb = {};
        for (const method of ['select', 'addSelect', 'leftJoin', 'where', 'andWhere']) {
            qb[method] = vi.fn().mockReturnValue(qb);
        }
        qb.getMany = vi.fn().mockResolvedValue([
            {
                id: 'op1',
                operationNumber: '54',
                calendar: { id: 'c1', calendarName: '平日' },
            },
        ]);
        mockCreateQueryBuilder.mockReturnValue(qb);
        query = await buildQuery();
    });

    afterEach(() => vi.clearAllMocks());

    it('ダイヤを返さないときも、期間の絞り込みのため結合だけはする', async () => {
        const result = await query.findManyBySpecificPeriodWithSelection(
            { start: '2026-10-24', end: '2026-10-24' },
            parseSelection(
                { fields: { operation: 'operationNumber' } },
                OPERATIONS_BY_PERIOD_SELECTION_TREE,
            )!,
        );

        expect(qb.select).toHaveBeenCalledWith([
            'operation.id',
            'operation.operationNumber',
        ]);
        expect(qb.leftJoin).toHaveBeenCalledWith('operation.calendar', 'calendar');
        expect(qb.addSelect).not.toHaveBeenCalled();
        expect(qb.where).toHaveBeenCalledWith(
            '(calendar.start_date <= :endDate OR calendar.start_date IS NULL)',
            { endDate: '2026-10-24' },
        );
        expect(qb.andWhere).toHaveBeenCalledWith(
            '(calendar.end_date >= :startDate OR calendar.end_date IS NULL)',
            { startDate: '2026-10-24' },
        );
        expect(result).toEqual([{ id: 'op1', operationNumber: '54' }]);
    });

    it('include=calendar ならダイヤの列も選んで返す', async () => {
        const result = await query.findManyBySpecificPeriodWithSelection(
            { start: '2026-10-24', end: '2026-10-24' },
            parseSelection(
                { include: 'calendar', fields: { operation: 'operationNumber', calendar: 'calendarName' } },
                OPERATIONS_BY_PERIOD_SELECTION_TREE,
            )!,
        );

        expect(qb.addSelect).toHaveBeenCalledWith(['calendar.id', 'calendar.calendarName']);
        expect(result).toEqual([
            {
                id: 'op1',
                operationNumber: '54',
                calendar: { id: 'c1', calendarName: '平日' },
            },
        ]);
    });
});

describe('OperationQuery - findOneWithTripsWithSelection', () => {
    let qb: any;
    let query: OperationQuery;

    beforeEach(async () => {
        qb = {};
        for (const method of ['select', 'addSelect', 'leftJoin', 'where', 'orderBy', 'addOrderBy']) {
            qb[method] = vi.fn().mockReturnValue(qb);
        }
        qb.getOne = vi.fn();
        mockCreateQueryBuilder.mockReturnValue(qb);
        query = await buildQuery();
    });

    afterEach(() => vi.clearAllMocks());

    it('運用 1 件を、運用表の trips と同じ形で返す', async () => {
        qb.getOne.mockResolvedValue({
            id: 'op1',
            operationNumber: '54',
            tripOperationLists: [{ id: 'tol1', tripId: 't1' }],
        });

        const result = await query.findOneWithTripsWithSelection(
            { operationId: 'op1' },
            parseSelection(
                {
                    include: 'trips',
                    fields: { operation: 'operationNumber', tripOperationList: 'tripId' },
                },
                OPERATION_WITH_TRIPS_SELECTION_TREE,
            )!,
        );

        expect(qb.where).toHaveBeenCalledWith('operation.id = :operationId', {
            operationId: 'op1',
        });
        expect(qb.orderBy).toHaveBeenCalledWith('startTime.departureDays', 'ASC', 'NULLS LAST');
        expect(result).toEqual({
            operation: { id: 'op1', operationNumber: '54' },
            trips: [{ id: 'tol1', tripId: 't1' }],
        });
    });

    it('見つからなければ null', async () => {
        qb.getOne.mockResolvedValue(null);

        const result = await query.findOneWithTripsWithSelection(
            { operationId: 'none' },
            parseSelection({ include: '' }, OPERATION_WITH_TRIPS_SELECTION_TREE)!,
        );

        expect(result).toBeNull();
    });
});
```

- [ ] **Step 3: service の spec を書く**

`operation.v3.service.spec.ts` の mock の `OperationQuery` に `findManyBySpecificPeriod`・`findManyBySpecificPeriodWithSelection`・`findOneWithTrips`・`findOneWithTripsWithSelection` が無ければ足し、末尾に足す:

```ts
describe('OperationV3Service - 運用の from/to・:id/trips の選択', () => {
    let service: OperationV3Service;

    beforeEach(async () => {
        vi.clearAllMocks();
        service = await buildService();
    });

    it('from/to: 指定が無ければ今の取得', async () => {
        mockOperationQuery.findManyBySpecificPeriod.mockResolvedValue([]);
        await service.findManyBySpecificPeriod({ start: '2026-10-24', end: '2026-10-24' });
        expect(mockOperationQuery.findManyBySpecificPeriod).toHaveBeenCalled();
        expect(mockOperationQuery.findManyBySpecificPeriodWithSelection).not.toHaveBeenCalled();
    });

    it('from/to: 木に無い道筋は 400', async () => {
        await expect(
            service.findManyBySpecificPeriod({
                start: '2026-10-24',
                end: '2026-10-24',
                include: 'trips',
            }),
        ).rejects.toThrow(BadRequestException);
    });

    it(':id/trips: 指定があれば選んだ取得', async () => {
        mockOperationQuery.findOneWithTripsWithSelection.mockResolvedValue(null);
        await service.findOneWithTrips({ operationId: 'op1', include: 'trips' });
        expect(mockOperationQuery.findOneWithTripsWithSelection).toHaveBeenCalledWith(
            { operationId: 'op1' },
            expect.objectContaining({ paths: new Set(['operation', 'trips']) }),
        );
        expect(mockOperationQuery.findOneWithTrips).not.toHaveBeenCalled();
    });
});
```

（mock の変数名・`buildService` の名前は既存の spec に合わせる。`BadRequestException` の import が無ければ足す）

- [ ] **Step 4: 落ちることを確かめる**

Run: `npx vitest run src/libs/operation/ --reporter=default`
Expected: FAIL（メソッドが無い）

- [ ] **Step 5: query を実装する**

`operation.query.ts`:

1. `findManyBySpecificPeriod` の後ろに足す:

```ts
    /**
     * `findManyBySpecificPeriod` と同じ条件で、`include`・`fields` で選んだ関連・列だけを返す
     * （docs/adr/0010-v3-include-and-fields.md）。
     */
    async findManyBySpecificPeriodWithSelection(
        params: { start: string; end: string },
        selection: Selection,
    ): Promise<Record<string, unknown>[]> {
        const { start, end } = params;
        const tree = OPERATIONS_BY_PERIOD_SELECTION_TREE;

        const format = 'YYYY-MM-DD';
        const startDate = dayjs(start, format);
        const endDate = dayjs(end, format);

        const qb = this.operationRepository
            .createQueryBuilder('operation')
            .select(selectColumns('operation', tree, selection))
            // 期間の絞り込みに使うので、ダイヤを返さないときも結合だけはする
            .leftJoin('operation.calendar', 'calendar')
            .where(
                '(calendar.start_date <= :endDate OR calendar.start_date IS NULL)',
                { endDate: endDate.format(format) },
            )
            .andWhere(
                '(calendar.end_date >= :startDate OR calendar.end_date IS NULL)',
                { startDate: startDate.format(format) },
            );
        if (selection.paths.has('calendar')) {
            qb.addSelect(
                selectColumns('calendar', tree.relations.calendar, selection),
            );
        }

        const models = await qb.getMany();
        return models.map((model) => serializeSelection(model, tree, selection));
    }
```

2. PR 1 の `findManyWithTripsWithSelection` の組み立て（`select` から `trips.trip.tripClass` の結合まで。`.where(...)` は除く）を private メソッド `#withTripsSelectionQuery(selection: Selection)` に移して qb を返す。`findManyWithTripsWithSelection` は次の形にする（中身の結合・並びは変えない）:

```ts
    async findManyWithTripsWithSelection(
        params: { calendarId: string },
        selection: Selection,
    ): Promise<Record<string, unknown>[]> {
        const { calendarId } = params;
        const models = await this.#withTripsSelectionQuery(selection)
            .where('operation.calendar_id = :calendarId', { calendarId })
            .getMany();
        return models.map((model) =>
            serializeSelection(
                { operation: model, trips: model.tripOperationLists },
                OPERATION_WITH_TRIPS_SELECTION_TREE,
                selection,
            ),
        );
    }

    /** `findOneWithTrips` の選択の版（`findManyWithTripsWithSelection` と同じ形・並び） */
    async findOneWithTripsWithSelection(
        params: { operationId: string },
        selection: Selection,
    ): Promise<Record<string, unknown> | null> {
        const { operationId } = params;
        const model = await this.#withTripsSelectionQuery(selection)
            .where('operation.id = :operationId', { operationId })
            .getOne();
        if (!model) {
            return null;
        }
        return serializeSelection(
            { operation: model, trips: model.tripOperationLists },
            OPERATION_WITH_TRIPS_SELECTION_TREE,
            selection,
        );
    }
```

`#withTripsSelectionQuery` の先頭は `this.operationRepository.createQueryBuilder('operation').select(selectColumns('operation', operation, selection))` で始め、PR 1 の `if (selection.paths.has(...))` の並びをそのまま続けて `return qb;`。import に `OPERATIONS_BY_PERIOD_SELECTION_TREE` を足す。

- [ ] **Step 6: service と controller を実装する**

`operation.v3.service.ts`（import に `OPERATIONS_BY_PERIOD_SELECTION_TREE` を足す）:

```ts
    /** `include`・`fields` があれば選んだ関連・列だけを返す（docs/adr/0010-v3-include-and-fields.md） */
    findManyBySpecificPeriod(params: {
        start: string;
        end: string;
        include?: unknown;
        fields?: unknown;
    }): Promise<OperationDetailsDto[] | Record<string, unknown>[]> {
        const { start, end, include, fields } = params;
        const selection = parseSelection(
            { include, fields },
            OPERATIONS_BY_PERIOD_SELECTION_TREE,
        );
        if (!selection) {
            return this.operationQuery.findManyBySpecificPeriod({ start, end });
        }
        return this.operationQuery.findManyBySpecificPeriodWithSelection(
            { start, end },
            selection,
        );
    }
```

```ts
    /** `include`・`fields` があれば選んだ関連・列だけを返す（docs/adr/0010-v3-include-and-fields.md） */
    findOneWithTrips(params: {
        operationId: string;
        include?: unknown;
        fields?: unknown;
    }): Promise<OperationWithTripsDto | Record<string, unknown> | null> {
        const { operationId, include, fields } = params;
        const selection = parseSelection(
            { include, fields },
            OPERATION_WITH_TRIPS_SELECTION_TREE,
        );
        if (!selection) {
            return this.operationQuery.findOneWithTrips({ operationId });
        }
        return this.operationQuery.findOneWithTripsWithSelection(
            { operationId },
            selection,
        );
    }
```

controller の `findManyBySpecificPeriod`・`findOneWithTrips` に `@Query('include') include?: unknown, @Query('fields') fields?: unknown` を足して service に渡し、戻り値の型を service に合わせる。JSDoc に `` `include`・`fields` で返す関連・列を選べる（docs/adr/0010-v3-include-and-fields.md） `` を書く（`findManyWithTrips` と同じ言い方）。

- [ ] **Step 7: 通ることを確かめる**

Run: `npx vitest run src/libs/operation/ --reporter=default`
Expected: PASS（PR 1 の `findManyWithTripsWithSelection` の spec も通る）

- [ ] **Step 8: コミット**

```bash
git add src/libs/operation/
git commit -m "feat: :sparkles: 運用の期間・列車つき 1 件に include と fields を足す"
```

---

### Task 4: 編成の `as/of`・`from/to`

**Files:**
- Create: `src/libs/formation/usecase/formation-selection-columns.ts`
- Create: `src/libs/vehicle/usecase/vehicle-selection-columns.ts`
- Create: `src/libs/agency/usecase/agency-selection-columns.ts`
- Create: `src/libs/formation/usecase/formation-selection.ts`
- Modify: `src/libs/formation/infrastructure/queries/formation.query.ts`
- Modify: `src/libs/formation/usecase/formation.v3.service.ts`
- Modify: `src/libs/formation/presentation/formation.v3.controller.ts`
- Test: `src/libs/formation/infrastructure/queries/formation.query.spec.ts`、`src/libs/formation/usecase/formation.v3.service.spec.ts`

**Interfaces:**
- Produces:
  - `FORMATION_COLUMNS`・`VEHICLE_FORMATION_COLUMNS`（formation）、`VEHICLE_COLUMNS`（vehicle）、`AGENCY_COLUMNS`（agency）
  - `FORMATIONS_AS_OF_SELECTION_TREE`・`FORMATIONS_BY_PERIOD_SELECTION_TREE`
  - `FormationQuery.findManyBySpecificDateWithSelection(params: { date: string }, selection: Selection): Promise<Record<string, unknown>[]>`
  - `FormationQuery.findManyBySpecificPeriodWithSelection(params: { startDate: string; endDate: string }, selection: Selection): Promise<Record<string, unknown>[]>`

- [ ] **Step 1: 列と木を作る**

`src/libs/formation/usecase/formation-selection-columns.ts`:

```ts
import { columnsOf } from '../../../core/utils/selection/selection-tree.js';

/** `fields[formation]` で選べる列（docs/adr/0010-v3-include-and-fields.md）。formationId の別名は木ごとに足す */
export const FORMATION_COLUMNS = columnsOf(
    'id',
    'agencyId',
    'vehicleType',
    'formationNumber',
    'formationDescription',
    'startDate',
    'endDate',
    'createdAt',
    'updatedAt',
);

/** `fields[vehicleFormation]` で選べる列 */
export const VEHICLE_FORMATION_COLUMNS = columnsOf(
    'id',
    'formationId',
    'vehicleId',
    'carNumber',
    'createdAt',
    'updatedAt',
);
```

`src/libs/vehicle/usecase/vehicle-selection-columns.ts`:

```ts
import { columnsOf } from '../../../core/utils/selection/selection-tree.js';

/** `fields[vehicle]` で選べる列（docs/adr/0010-v3-include-and-fields.md） */
export const VEHICLE_COLUMNS = columnsOf(
    'id',
    'vehicleNumber',
    'belongs',
    'productionDate',
    'scrappedDate',
    'createdAt',
    'updatedAt',
);
```

`src/libs/agency/usecase/agency-selection-columns.ts`:

```ts
import { columnsOf } from '../../../core/utils/selection/selection-tree.js';

/** `fields[agency]` で選べる列（docs/adr/0010-v3-include-and-fields.md） */
export const AGENCY_COLUMNS = columnsOf(
    'id',
    'agencyNumber',
    'parentAgencyNumber',
    'agencyOfficialName',
    'agencyName',
    'agencyType',
    'agencyUrl',
    'agencyPhone',
    'agencyFareUrl',
    'createdAt',
    'updatedAt',
);
```

`src/libs/formation/usecase/formation-selection.ts`:

```ts
import { defineSelectionTree } from '../../../core/utils/selection/selection-tree.js';
import { AGENCY_COLUMNS } from '../../agency/usecase/agency-selection-columns.js';
import { VEHICLE_COLUMNS } from '../../vehicle/usecase/vehicle-selection-columns.js';
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

/** `GET /v3/formations/as/of/:date` の `include`・`fields` で選べる範囲（docs/adr/0010-v3-include-and-fields.md） */
export const FORMATIONS_AS_OF_SELECTION_TREE = defineSelectionTree({
    ...FORMATION_ROOT,
    relations: {
        vehicleFormations: {
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
                },
            },
        },
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
    },
});
```

- [ ] **Step 2: query の spec を書く**

`formation.query.spec.ts` の末尾に足す（import に `parseSelection`・2 つの木を足す。`buildQuery` 相当の組み立てと `mockCreateQueryBuilder` は既存の spec のものを使い、名前が違えば合わせる）:

```ts
describe('FormationQuery - 選択の取得', () => {
    let qb: any;
    let query: FormationQuery;

    beforeEach(async () => {
        qb = {};
        for (const method of ['select', 'addSelect', 'leftJoin', 'where', 'andWhere', 'orderBy', 'addOrderBy']) {
            qb[method] = vi.fn().mockReturnValue(qb);
        }
        qb.getMany = vi.fn().mockResolvedValue([
            {
                id: 'f1',
                formationNumber: '10701',
                vehicleFormations: [
                    { id: 'vf1', carNumber: 1, vehicle: { id: 'v1', vehicleNumber: '10701' } },
                ],
                agency: { id: 'a1', agencyName: '相鉄' },
            },
        ]);
        mockCreateQueryBuilder.mockReturnValue(qb);
        query = await buildQuery();
    });

    afterEach(() => vi.clearAllMocks());

    it('as/of: 車両を挙げなければ結合せず、並びは今と同じ', async () => {
        const result = await query.findManyBySpecificDateWithSelection(
            { date: '2026-10-24' },
            parseSelection({ include: '', fields: { formation: 'formationNumber' } }, FORMATIONS_AS_OF_SELECTION_TREE)!,
        );

        expect(qb.select).toHaveBeenCalledWith(['formation.id', 'formation.formationNumber']);
        expect(qb.leftJoin).not.toHaveBeenCalled();
        expect(qb.orderBy).toHaveBeenCalledWith("to_number(formation.vehicle_type, '9999999999999999')", 'ASC');
        expect(qb.addOrderBy).toHaveBeenCalledWith("to_number(formation.formation_number, '9999999999999999')", 'ASC');
        expect(result).toEqual([{ id: 'f1', formationNumber: '10701' }]);
    });

    it('as/of: include=vehicleFormations.vehicle なら号車と車両を結合する', async () => {
        const result = await query.findManyBySpecificDateWithSelection(
            { date: '2026-10-24' },
            parseSelection(
                {
                    include: 'vehicleFormations.vehicle',
                    fields: { formation: 'formationNumber', vehicleFormation: 'carNumber', vehicle: 'vehicleNumber' },
                },
                FORMATIONS_AS_OF_SELECTION_TREE,
            )!,
        );

        expect(qb.leftJoin).toHaveBeenCalledWith('formation.vehicleFormations', 'vehicleFormations');
        expect(qb.leftJoin).toHaveBeenCalledWith('vehicleFormations.vehicle', 'vehicle');
        expect(qb.addSelect).toHaveBeenCalledWith(['vehicleFormations.id', 'vehicleFormations.carNumber']);
        expect(qb.addSelect).toHaveBeenCalledWith(['vehicle.id', 'vehicle.vehicleNumber']);
        expect(result).toEqual([
            {
                id: 'f1',
                formationNumber: '10701',
                vehicleFormations: [{ id: 'vf1', carNumber: 1, vehicle: { id: 'v1', vehicleNumber: '10701' } }],
            },
        ]);
    });

    it('from/to: include=agency なら事業者を結合する', async () => {
        const result = await query.findManyBySpecificPeriodWithSelection(
            { startDate: '2026-10-24', endDate: '2026-10-24' },
            parseSelection(
                { include: 'agency', fields: { formation: 'formationNumber', agency: 'agencyName' } },
                FORMATIONS_BY_PERIOD_SELECTION_TREE,
            )!,
        );

        expect(qb.leftJoin).toHaveBeenCalledWith('formation.agency', 'agency');
        expect(qb.addSelect).toHaveBeenCalledWith(['agency.id', 'agency.agencyName']);
        expect(qb.where).toHaveBeenCalledWith(
            '(formation.start_date <= :endDate OR formation.start_date IS NULL)',
            { endDate: '2026-10-24' },
        );
        expect(result).toEqual([
            { id: 'f1', formationNumber: '10701', agency: { id: 'a1', agencyName: '相鉄' } },
        ]);
    });
});
```

- [ ] **Step 3: service の spec を書く**

`formation.v3.service.spec.ts` の `mockFormationQuery` に `findManyBySpecificDate`・`findManyBySpecificDateWithSelection`・`findManyBySpecificPeriodWithSelection` を足し、末尾に足す:

```ts
describe('FormationV3Service - 選択', () => {
    let service: FormationV3Service;

    beforeEach(async () => {
        vi.clearAllMocks();
        service = await buildService();
    });

    it('as/of: 指定が無ければ今の取得', async () => {
        mockFormationQuery.findManyBySpecificDate.mockResolvedValue([]);
        await service.findManyBySpecificDate({ date: '2026-10-24' });
        expect(mockFormationQuery.findManyBySpecificDate).toHaveBeenCalledWith({ date: '2026-10-24' });
        expect(mockFormationQuery.findManyBySpecificDateWithSelection).not.toHaveBeenCalled();
    });

    it('as/of: 指定があれば選んだ取得', async () => {
        mockFormationQuery.findManyBySpecificDateWithSelection.mockResolvedValue([]);
        await service.findManyBySpecificDate({ date: '2026-10-24', include: 'vehicleFormations' });
        expect(mockFormationQuery.findManyBySpecificDateWithSelection).toHaveBeenCalledWith(
            { date: '2026-10-24' },
            { paths: new Set(['vehicleFormations']), fields: new Map() },
        );
    });

    it('from/to: 木に無い道筋は 400', async () => {
        await expect(
            service.findManyBySpecificPeriod({
                startDate: '2026-10-24',
                endDate: '2026-10-24',
                include: 'vehicleFormations',
            }),
        ).rejects.toThrow(BadRequestException);
    });
});
```

- [ ] **Step 4: 落ちることを確かめる**

Run: `npx vitest run src/libs/formation/ --reporter=default`
Expected: FAIL

- [ ] **Step 5: query を実装する**

`formation.query.ts` に足す（`Selection`・`selectColumns`・`serializeSelection`・2 つの木を import）。絞り込みと並びは既存のメソッドと同じ文字列:

```ts
    /**
     * `findManyBySpecificDate` と同じ条件・並びで、`include`・`fields` で選んだ関連・列だけを返す
     * （docs/adr/0010-v3-include-and-fields.md）。
     */
    async findManyBySpecificDateWithSelection(
        params: { date: string },
        selection: Selection,
    ): Promise<Record<string, unknown>[]> {
        const { date } = params;
        const tree = FORMATIONS_AS_OF_SELECTION_TREE;
        const { vehicleFormations } = tree.relations;

        const qb = this.formationRepository
            .createQueryBuilder('formation')
            .select(selectColumns('formation', tree, selection))
            .where(
                '(formation.start_date <= :date OR formation.start_date IS NULL)',
                { date },
            )
            .andWhere(
                '(formation.end_date >= :date OR formation.end_date IS NULL)',
                { date },
            )
            .orderBy(
                "to_number(formation.vehicle_type, '9999999999999999')",
                'ASC',
            )
            .addOrderBy(
                "to_number(formation.formation_number, '9999999999999999')",
                'ASC',
            );
        if (selection.paths.has('vehicleFormations')) {
            qb.leftJoin('formation.vehicleFormations', 'vehicleFormations').addSelect(
                selectColumns('vehicleFormations', vehicleFormations, selection),
            );
        }
        if (selection.paths.has('vehicleFormations.vehicle')) {
            qb.leftJoin('vehicleFormations.vehicle', 'vehicle').addSelect(
                selectColumns('vehicle', vehicleFormations.relations.vehicle, selection),
            );
        }

        const models = await qb.getMany();
        return models.map((model) => serializeSelection(model, tree, selection));
    }

    /**
     * `findManyBySpecificPeriod` と同じ条件・並びで、`include`・`fields` で選んだ関連・列だけを返す。
     */
    async findManyBySpecificPeriodWithSelection(
        params: { startDate: string; endDate: string },
        selection: Selection,
    ): Promise<Record<string, unknown>[]> {
        const { startDate, endDate } = params;
        const tree = FORMATIONS_BY_PERIOD_SELECTION_TREE;

        const format = 'YYYY-MM-DD';
        const startDateInstance = dayjs(startDate, format);
        const endDateInstance = dayjs(endDate, format);

        const qb = this.formationRepository
            .createQueryBuilder('formation')
            .select(selectColumns('formation', tree, selection))
            .where(
                '(formation.start_date <= :endDate OR formation.start_date IS NULL)',
                { endDate: endDateInstance.format(format) },
            )
            .andWhere(
                '(formation.end_date >= :startDate OR formation.end_date IS NULL)',
                { startDate: startDateInstance.format(format) },
            )
            .orderBy(
                "to_number(formation.vehicle_type, '9999999999999999')",
                'ASC',
            )
            .addOrderBy(
                "to_number(formation.formation_number, '9999999999999999')",
                'ASC',
            );
        if (selection.paths.has('agency')) {
            qb.leftJoin('formation.agency', 'agency').addSelect(
                selectColumns('agency', tree.relations.agency, selection),
            );
        }

        const models = await qb.getMany();
        return models.map((model) => serializeSelection(model, tree, selection));
    }
```

- [ ] **Step 6: service と controller を実装する**

`formation.v3.service.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { parseSelection } from '../../../core/utils/selection/parse-selection.js';
import { FormationQuery } from '../infrastructure/queries/formation.query.js';
import { FormationDetailsDto } from './dtos/formation-details.dto.js';
import {
    FORMATIONS_AS_OF_SELECTION_TREE,
    FORMATIONS_BY_PERIOD_SELECTION_TREE,
} from './formation-selection.js';
import { FormationFindManyBySpecificPeriodParam } from './params/formation-find-many-by-specific-period.param.js';

/** `include`・`fields` があれば選んだ関連・列だけを返す（docs/adr/0010-v3-include-and-fields.md） */
@Injectable()
export class FormationV3Service {
    constructor(private readonly formationQuery: FormationQuery) {}

    findManyBySpecificDate(params: {
        date: string;
        include?: unknown;
        fields?: unknown;
    }): Promise<FormationDetailsDto[] | Record<string, unknown>[]> {
        const { date, include, fields } = params;
        const selection = parseSelection(
            { include, fields },
            FORMATIONS_AS_OF_SELECTION_TREE,
        );
        if (!selection) {
            return this.formationQuery.findManyBySpecificDate({ date });
        }
        return this.formationQuery.findManyBySpecificDateWithSelection(
            { date },
            selection,
        );
    }

    findManyBySpecificPeriod(
        params: FormationFindManyBySpecificPeriodParam & {
            include?: unknown;
            fields?: unknown;
        },
    ): Promise<FormationDetailsDto[] | Record<string, unknown>[]> {
        const { startDate, endDate, include, fields } = params;
        const selection = parseSelection(
            { include, fields },
            FORMATIONS_BY_PERIOD_SELECTION_TREE,
        );
        if (!selection) {
            return this.formationQuery.findManyBySpecificPeriod({
                startDate,
                endDate,
            });
        }
        return this.formationQuery.findManyBySpecificPeriodWithSelection(
            { startDate, endDate },
            selection,
        );
    }
}
```

既存の service spec が `findManyBySpecificPeriod(params)` を `params` そのままで呼ばれたと確かめていれば、`{ startDate, endDate }` で呼ばれる形に直す（中身は同じ）。

controller の 2 本に `@Query('include') include?: unknown, @Query('fields') fields?: unknown` を足し、`{ date, include, fields }`・`{ ...params, include, fields }` を渡す。戻り値の型を service に合わせ、`Query` を import に足す。各メソッドに JSDoc `` `include`・`fields` で返す関連・列を選べる（docs/adr/0010-v3-include-and-fields.md） `` を書く。

- [ ] **Step 7: 通ることを確かめる**

Run: `npx vitest run src/libs/formation/ --reporter=default`
Expected: PASS

- [ ] **Step 8: コミット**

```bash
git add src/libs/formation/ src/libs/vehicle/usecase/vehicle-selection-columns.ts src/libs/agency/usecase/agency-selection-columns.ts
git commit -m "feat: :sparkles: 編成の日付・期間の一覧に include と fields を足す"
```

---

### Task 5: 目撃の `from/to`

**Files:**
- Create: `src/libs/operation-sighting/usecase/operation-sighting-selection-columns.ts`
- Create: `src/libs/operation-sighting/usecase/operation-sightings-by-period-selection.ts`
- Modify: `src/libs/operation-sighting/usecase/operation-sighting.v3.service.ts`
- Modify: `src/libs/operation-sighting/presentation/operation-sighting.v3.controller.ts`
- Test: `src/libs/operation-sighting/usecase/operation-sighting.v3.service.spec.ts`

**Interfaces:**
- Consumes: `OPERATION_COLUMNS`（operation）、`FORMATION_COLUMNS`（Task 4）
- Produces:
  - `OPERATION_SIGHTING_COLUMNS`・`OPERATION_SIGHTING_INVALIDATION_COLUMNS`・`OPERATION_SIGHTING_MANAGEMENT_LOG_COLUMNS`・`SIGHTED_AS_OPERATION_COLUMNS`
  - `OPERATION_SIGHTINGS_BY_PERIOD_SELECTION_TREE`

この口は引き継いだ目撃を計算で足すので、SQL は今のまま、作った DTO を木に沿って削る。本番の応答（2026-10-24 に確かめた形）:
- 直接の目撃: `id, operationSightingId, formationId, operationId, sightingTime, createdAt, updatedAt, invalidation, managementLogs`
- 引き継いだ目撃: 上の `managementLogs` の代わりに `operation, formation, sightedAsOperation` がある
- `invalidation`: `operationSightingInvalidationId, operationSightingId, createdAt, updatedAt`
- `managementLogs[]`: `operationSightingManagementLogId, operationSightingId, userId, action, reason, createdAt, updatedAt`
- `sightedAsOperation`: `operationId, operationNumber`

- [ ] **Step 1: 列と木を作る**

`src/libs/operation-sighting/usecase/operation-sighting-selection-columns.ts`:

```ts
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
);

/** `fields[operationSightingInvalidation]` で選べる列 */
export const OPERATION_SIGHTING_INVALIDATION_COLUMNS = columnsOf(
    'operationSightingInvalidationId',
    'operationSightingId',
    'createdAt',
    'updatedAt',
);

/** `fields[operationSightingManagementLog]` で選べる列 */
export const OPERATION_SIGHTING_MANAGEMENT_LOG_COLUMNS = columnsOf(
    'operationSightingManagementLogId',
    'operationSightingId',
    'userId',
    'action',
    'reason',
    'createdAt',
    'updatedAt',
);

/** 引き継いだ目撃の「目撃されたときの運用」。常に全項目で返す */
export const SIGHTED_AS_OPERATION_COLUMNS = columnsOf(
    'operationId',
    'operationNumber',
);
```

`src/libs/operation-sighting/usecase/operation-sightings-by-period-selection.ts`:

```ts
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
export const OPERATION_SIGHTINGS_BY_PERIOD_SELECTION_TREE = defineSelectionTree({
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
        invalidation: {
            property: 'invalidation',
            many: false,
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
});
```

- [ ] **Step 2: service の spec を書く**

`operation-sighting.v3.service.spec.ts` の `describe('OperationSightingV3Service - findManyBySpecificPeriod includeCarriedOver', …)` の中（`beforeEach` の後）に足す:

```ts
    it('fields があれば作った一覧を削り、引き継いだ目撃の印は全項目で残す', async () => {
        const result = (await service.findManyBySpecificPeriod({
            start: '2026-10-12',
            end: '2026-10-12',
            includeCarriedOver: true,
            fields: { operationSighting: 'sightingTime' },
        })) as Record<string, unknown>[];

        const carried = result.find((o) => o.sightedAsOperation);
        expect(carried).toEqual({
            id: expect.any(String),
            sightingTime: expect.any(Date),
            sightedAsOperation: { operationId: 'op-11K', operationNumber: '11K' },
        });
        expect(result.find((o) => o.id === 'a')).toEqual({
            id: 'a',
            sightingTime: at('07:00'),
        });
    });

    it('include に木に無い道筋があれば、問い合わせる前に 400', async () => {
        await expect(
            service.findManyBySpecificPeriod({
                start: '2026-10-12',
                end: '2026-10-12',
                include: 'trips',
            }),
        ).rejects.toThrow(BadRequestException);
        expect(mockOperationSightingQuery.findManyBySpecificPeriod).not.toHaveBeenCalled();
    });
```

（この describe の場面で引き継いだ目撃が 1 件以上できることは、既存の it が確かめている。`sightedAsOperation` の値が違えば、既存の it の期待値に合わせる。`BadRequestException` の import が無ければ足す）

- [ ] **Step 3: 落ちることを確かめる**

Run: `npx vitest run src/libs/operation-sighting/usecase/operation-sighting.v3.service.spec.ts --reporter=default`
Expected: FAIL

- [ ] **Step 4: 実装する**

`operation-sighting.v3.service.ts`:
1. 今の `findManyBySpecificPeriod` の本体を、中身を変えずに private の `async #findManyBySpecificPeriodFull(params: { start: string; end: string; includeInvalidated?: boolean; includeCarriedOver?: boolean }): Promise<OperationSightingDetailsDto[]>` に移す
2. 公開の `findManyBySpecificPeriod` を次にする（import に `parseSelection`・`serializeSelection`・木を足す）:

```ts
    /** `include`・`fields` があれば、作った一覧を選んだ関連・列だけに削る（docs/adr/0010-v3-include-and-fields.md） */
    async findManyBySpecificPeriod(params: {
        start: string;
        end: string;
        includeInvalidated?: boolean;
        includeCarriedOver?: boolean;
        include?: unknown;
        fields?: unknown;
    }): Promise<OperationSightingDetailsDto[] | Record<string, unknown>[]> {
        const { include, fields, ...rest } = params;
        const tree = OPERATION_SIGHTINGS_BY_PERIOD_SELECTION_TREE;
        const selection = parseSelection({ include, fields }, tree);
        const sightings = await this.#findManyBySpecificPeriodFull(rest);
        if (!selection) {
            return sightings;
        }
        return sightings.map((o) => serializeSelection(o, tree, selection));
    }
```

3. controller の `findManyBySpecificPeriod` に `@Query('include') include?: unknown, @Query('fields') fields?: unknown` を足して渡し、戻り値の型を合わせ、JSDoc `` `include`・`fields` で返す関連・列を選べる（docs/adr/0010-v3-include-and-fields.md） `` を書く

service の中で `findManyBySpecificPeriod` を他から呼んでいる所があれば（grep で確かめる）、`#findManyBySpecificPeriodFull` を呼ぶよう直す。

- [ ] **Step 5: 通ることを確かめる**

Run: `npx vitest run src/libs/operation-sighting/ --reporter=default`
Expected: PASS

- [ ] **Step 6: コミット**

```bash
git add src/libs/operation-sighting/
git commit -m "feat: :sparkles: 目撃情報の期間の一覧に include と fields を足す"
```

---

### Task 6: 運用の read-model 4 本に `fields`

**Files:**
- Create: `src/libs/operation/usecase/operation-read-model-selection.ts`
- Modify: `src/libs/operation/usecase/operation.v3.service.ts`
- Modify: `src/libs/operation/presentation/operation.v3.controller.ts`
- Test: `src/libs/operation/usecase/operation.v3.service.spec.ts`

**Interfaces:**
- Consumes: `parseFieldsOnly`（Task 1）、`OPERATION_COLUMNS`・`TRIP_OPERATION_LIST_COLUMNS`・`TRIP_COLUMNS`・`TIME_COLUMNS`
- Produces: `OPERATION_CURRENT_POSITION_SELECTION_TREE`・`OPERATION_ITINERARY_LINK_SELECTION_TREE`・`NEXT_SEGMENT_CANDIDATE_SELECTION_TREE`

本番の応答（2026-10-24 に確かめた形）:
- 現在位置: `{ operation: {id, calendarId, operationNumber, createdAt, updatedAt}, prev|current|next: 区間 {…, trip: 列車（tripClass なし）, startTime, endTime} | null }`
- つながり: `{ tripOperationListId, tripId, operationId, previous|next: {tripOperationListId, tripId, operationId, operationNumber, stationId, rule} | null }`
- 次の運用の候補: `{ tripOperationListId, tripId, operationId, operationNumber, startStationId, startSeconds, isTaken, isFixedByTripBlock }`

- [ ] **Step 1: 木を作る**

`src/libs/operation/usecase/operation-read-model-selection.ts`:

```ts
import {
    columnsOf,
    defineSelectionTree,
} from '../../../core/utils/selection/selection-tree.js';
import {
    TIME_COLUMNS,
    TRIP_COLUMNS,
    TRIP_OPERATION_LIST_COLUMNS,
} from '../../trip/usecase/trip-selection-columns.js';
import { OPERATION_COLUMNS } from './operation-selection-columns.js';

// 現在位置の前・今・次の区間（列車と始終着の時刻つき）
const segment = <P extends string>(property: P) =>
    ({
        property,
        many: false,
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
    }) as const;

/**
 * `GET /v3/operations/current-positions`・`/:id/current-position` の `fields` で選べる範囲
 * （docs/adr/0010-v3-include-and-fields.md）。read-model なので include は受けない。
 */
export const OPERATION_CURRENT_POSITION_SELECTION_TREE = defineSelectionTree({
    resource: null,
    columns: {},
    relations: {
        operation: {
            property: 'operation',
            many: false,
            resource: 'operation',
            columns: OPERATION_COLUMNS,
            alwaysKeys: ['id'],
        },
        prev: segment('prev'),
        current: segment('current'),
        next: segment('next'),
    },
});

const ITINERARY_LINK_END_COLUMNS = columnsOf(
    'tripOperationListId',
    'tripId',
    'operationId',
    'operationNumber',
    'stationId',
    'rule',
);

/** `GET /v3/operations/itinerary-links` の `fields` で選べる範囲 */
export const OPERATION_ITINERARY_LINK_SELECTION_TREE = defineSelectionTree({
    resource: 'itineraryLink',
    columns: columnsOf('tripOperationListId', 'tripId', 'operationId'),
    alwaysKeys: ['tripOperationListId'],
    relations: {
        previous: {
            property: 'previous',
            many: false,
            resource: 'itineraryLinkEnd',
            columns: ITINERARY_LINK_END_COLUMNS,
            alwaysKeys: ['tripOperationListId'],
        },
        next: {
            property: 'next',
            many: false,
            resource: 'itineraryLinkEnd',
            columns: ITINERARY_LINK_END_COLUMNS,
            alwaysKeys: ['tripOperationListId'],
        },
    },
});

/** `GET /v3/operations/next-operation-candidates` の `fields` で選べる範囲 */
export const NEXT_SEGMENT_CANDIDATE_SELECTION_TREE = defineSelectionTree({
    resource: 'nextSegmentCandidate',
    columns: columnsOf(
        'tripOperationListId',
        'tripId',
        'operationId',
        'operationNumber',
        'startStationId',
        'startSeconds',
        'isTaken',
        'isFixedByTripBlock',
    ),
    alwaysKeys: ['tripOperationListId'],
});
```

- [ ] **Step 2: service の spec を書く**

`operation.v3.service.spec.ts` の mock の `OperationQuery` に `findOneWithCurrentPosition`・`findManyWithCurrentPosition` が無ければ足し、末尾に足す（つながり・候補の計算に要る `itinerarySegmentQuery` の mock は既存の spec のものを使う）:

```ts
describe('OperationV3Service - read-model の fields', () => {
    let service: OperationV3Service;
    const position = {
        operation: { id: 'op1', calendarId: 'c1', operationNumber: '54', createdAt: new Date(0), updatedAt: new Date(0) },
        prev: null,
        current: {
            id: 'tol1',
            tripId: 't1',
            trip: { id: 't1', tripNumber: '6000', depotIn: false },
            startTime: { id: 'tm1', departureTime: '04:39:00' },
            endTime: { id: 'tm2', arrivalTime: '05:10:00' },
        },
        next: null,
    };

    beforeEach(async () => {
        vi.clearAllMocks();
        service = await buildService();
    });

    it('現在位置: fields に挙げた資源だけを削り、挙げない資源は全項目', async () => {
        mockOperationQuery.findManyWithCurrentPosition.mockResolvedValue([position]);

        const result = await service.findManyWithCurrentPosition({
            operationIds: ['op1'],
            searchTime: '2026-10-24T05:00:00+09:00',
            fields: { trip: 'tripNumber' },
        });

        expect(result).toEqual([
            {
                operation: position.operation,
                current: {
                    id: 'tol1',
                    tripId: 't1',
                    trip: { id: 't1', tripNumber: '6000' },
                    startTime: { id: 'tm1', departureTime: '04:39:00' },
                    endTime: { id: 'tm2', arrivalTime: '05:10:00' },
                },
            },
        ]);
    });

    it('現在位置: include は 400', async () => {
        await expect(
            service.findOneWithCurrentPosition({ operationId: 'op1', include: 'current' }),
        ).rejects.toThrow(BadRequestException);
        expect(mockOperationQuery.findOneWithCurrentPosition).not.toHaveBeenCalled();
    });

    it('次の運用の候補: 駅が無くても fields は検める', async () => {
        await expect(
            service.findManyNextSegmentCandidates({
                calendarId: 'c1',
                afterSeconds: 0,
                fields: { nextSegmentCandidate: 'password' },
            }),
        ).rejects.toThrow(BadRequestException);
    });

    it('次の運用の候補: 駅が無ければ空', async () => {
        await expect(
            service.findManyNextSegmentCandidates({ calendarId: 'c1', afterSeconds: 0 }),
        ).resolves.toEqual([]);
    });
});
```

- [ ] **Step 3: 落ちることを確かめる**

Run: `npx vitest run src/libs/operation/usecase/operation.v3.service.spec.ts --reporter=default`
Expected: FAIL

- [ ] **Step 4: service を実装する**

`operation.v3.service.ts`（import に `parseFieldsOnly`・`serializeSelection`・3 つの木を足す）。各メソッドで、問い合わせる前に `parseFieldsOnly` で読む:

```ts
    /** `fields` があれば選んだ項目だけを返す（read-model なので include は受けない。docs/adr/0010-v3-include-and-fields.md） */
    async findOneWithCurrentPosition(params: {
        operationId: string;
        searchTime?: string;
        include?: unknown;
        fields?: unknown;
    }): Promise<OperationCurrentPositionDto | Record<string, unknown> | null> {
        const { operationId, searchTime, include, fields } = params;
        const tree = OPERATION_CURRENT_POSITION_SELECTION_TREE;
        const selection = parseFieldsOnly({ include, fields }, tree);
        const result = await this.operationQuery.findOneWithCurrentPosition({
            operationId,
            searchTime,
        });
        if (!selection || !result) {
            return result;
        }
        return serializeSelection(result, tree, selection);
    }

    async findManyWithCurrentPosition(params: {
        operationIds: string[];
        searchTime?: string;
        include?: unknown;
        fields?: unknown;
    }): Promise<OperationCurrentPositionDto[] | Record<string, unknown>[]> {
        const tree = OPERATION_CURRENT_POSITION_SELECTION_TREE;
        const selection = parseFieldsOnly(params, tree);
        const result = await this.operationQuery.findManyWithCurrentPosition({
            operationIds: params.operationIds,
            searchTime: params.searchTime ?? dayjs().toISOString(),
        });
        if (!selection) {
            return result;
        }
        return result.map((o) => serializeSelection(o, tree, selection));
    }

    async findManyItineraryLinks(params: {
        calendarId: string;
        include?: unknown;
        fields?: unknown;
    }): Promise<OperationItineraryLinkDto[] | Record<string, unknown>[]> {
        const tree = OPERATION_ITINERARY_LINK_SELECTION_TREE;
        const selection = parseFieldsOnly(params, tree);
        const result = buildOperationItineraryLinks(
            VehicleItineraryReadModel.create(
                await this.itinerarySegmentQuery.findManyByCalendarId({
                    calendarId: params.calendarId,
                }),
            ),
        );
        if (!selection) {
            return result;
        }
        return result.map((o) => serializeSelection(o, tree, selection));
    }

    /** 駅が無ければ空（controller で返していたのをここへ移した。fields の検めを先にする） */
    async findManyNextSegmentCandidates(params: {
        calendarId: string;
        stationId?: string;
        afterSeconds: number;
        include?: unknown;
        fields?: unknown;
    }): Promise<NextSegmentCandidateDto[] | Record<string, unknown>[]> {
        const { calendarId, stationId, afterSeconds, include, fields } = params;
        const tree = NEXT_SEGMENT_CANDIDATE_SELECTION_TREE;
        const selection = parseFieldsOnly({ include, fields }, tree);
        if (!stationId) return [];
        const result = buildNextSegmentCandidates(
            await this.itinerarySegmentQuery.findManyByCalendarId({
                calendarId,
            }),
            { stationId, afterSeconds },
        );
        if (!selection) {
            return result;
        }
        return result.map((o) => serializeSelection(o, tree, selection));
    }
```

既存のメソッドが `async` でない・戻り値の扱いが違う所は、上の形に置き換える（全部入りの道の中身＝呼ぶ query と引数は変えない）。`buildNextSegmentCandidates` の第 2 引数の型が `{ stationId: string; afterSeconds: number }` と違えば、今の呼び出しに合わせる。

- [ ] **Step 5: controller を実装する**

`operation.v3.controller.ts` の 4 本（`itinerary-links`・`next-operation-candidates`・`current-positions`・`:id/current-position`）に `@Query('include') include?: unknown, @Query('fields') fields?: unknown` を足して service に渡し、戻り値の型を合わせる。`next-operation-candidates` の `if (!query.stationId) return [];` は消し、`stationId: query.stationId` をそのまま渡す。JSDoc の末尾に `` `fields` で返す項目を選べる（include は受けない。docs/adr/0010-v3-include-and-fields.md） `` を足す。

- [ ] **Step 6: 通ることを確かめる**

Run: `npx vitest run src/libs/operation/ --reporter=default`
Expected: PASS

- [ ] **Step 7: コミット**

```bash
git add src/libs/operation/
git commit -m "feat: :sparkles: 運用の現在位置・つながり・次の運用の候補に fields を足す"
```

---

### Task 7: 時刻断面 4 本に `fields`

**Files:**
- Create: `src/libs/operation-sighting/usecase/operation-sighting-time-cross-section-selection.ts`
- Modify: `src/libs/operation-sighting/usecase/operation-sighting.v3.service.ts`
- Modify: `src/libs/operation-sighting/presentation/operation-sighting.v3.controller.ts`
- Test: `src/libs/operation-sighting/usecase/operation-sighting.v3.service.spec.ts`

**Interfaces:**
- Consumes: `parseFieldsOnly`（Task 1）、Task 5 の列、`FORMATION_COLUMNS`（Task 4）
- Produces: `OPERATION_SIGHTING_TIME_CROSS_SECTION_SELECTION_TREE`

本番の応答（2026-10-24 に確かめた形）: `{ latestSighting: 目撃 {…, operation, formation, invalidation} | null, expectedSighting: { operation, formation } | null, sightedAsOperation?: { operationId, operationNumber } | null }`。`latestSighting.operation` に `operationId` は無く、`expectedSighting.operation` にはある（DTO を削るので、別名は DTO の同じ名前の項目を指し、無ければ出ない）。

- [ ] **Step 1: 木を作る**

`src/libs/operation-sighting/usecase/operation-sighting-time-cross-section-selection.ts`:

```ts
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
```

- [ ] **Step 2: service の spec を書く**

`describe('OperationSightingV3Service - 時刻断面をまとめて返す', …)` の中に足す。最初の it（運用番号: 65 と 61）と同じ mock をそのまま置き、呼び出しに `fields` を足す:

```ts
    it('fields があれば各断面を削り、キー（運用番号）は今と同じ', async () => {
        // ここに最初の it と同じ mock の設定を置く（findManyLatestByOperationNumbersAndBeforeSightingTime・
        // findManyByFormationNumbers・findManyLatestGroupByFormationByOperationNumbersAndSightingTimeRange・
        // mockFormationQuery.findManyBySpecificPeriod）

        const result = (await service.findManyTimeCrossSectionsByOperationNumbers({
            operationNumbers: ['65', '100', '61'],
            searchTime,
            fields: { formation: 'formationNumber' },
        })) as Record<string, Record<string, unknown>>;

        expect(Object.keys(result).sort()).toEqual(['61', '65']);
        expect(result['65'].expectedSighting).toMatchObject({
            formation: { id: 'f-1', formationNumber: '8001' },
        });
        // 断面が無いもの（null）は省く
        expect(result['61']).toEqual({});
    });

    it('include は問い合わせる前に 400', async () => {
        await expect(
            service.findManyTimeCrossSectionsByOperationNumbers({
                operationNumbers: ['65'],
                searchTime,
                include: 'latestSighting',
            }),
        ).rejects.toThrow(BadRequestException);
        expect(
            mockOperationSightingQuery.findManyLatestByOperationNumbersAndBeforeSightingTime,
        ).not.toHaveBeenCalled();
    });
```

（コメントの所は、最初の it の mock の設定を実際に写す。コメントは残さない）

- [ ] **Step 3: 落ちることを確かめる**

Run: `npx vitest run src/libs/operation-sighting/usecase/operation-sighting.v3.service.spec.ts --reporter=default`
Expected: FAIL

- [ ] **Step 4: 実装する**

`operation-sighting.v3.service.ts` の 4 本（`findManyTimeCrossSectionsByOperationNumbers`・`findManyTimeCrossSectionsByFormationNumbers`・`findOneTimeCrossSectionByOperationNumber`・`findOneTimeCrossSectionByFormationNumber`）に `include?: unknown; fields?: unknown` を足す。どれも同じ形にする:

1. 先頭で `const selection = parseFieldsOnly({ include, fields }, OPERATION_SIGHTING_TIME_CROSS_SECTION_SELECTION_TREE);`
2. 今の本体で結果を作る（本体は変えない。`return` している所は `const result = …` に受ける。本体が長ければ、PR 1・Task 5 と同じく中身を変えずに private メソッドへ移してよい）
3. 1 件の口: `return selection ? serializeSelection(result, TREE, selection) : result;`
4. まとめる口: `return selection ? Object.fromEntries(Object.entries(result).map(([key, value]) => [key, serializeSelection(value, TREE, selection)])) : result;`

戻り値の型は `OperationSightingTimeCrossSectionDto | Record<string, unknown>`・`Record<string, OperationSightingTimeCrossSectionDto | Record<string, unknown>>` にする。service の中で 4 本を他から呼んでいる所があれば（grep で確かめる）、`include`・`fields` を渡さない呼び出しのままで型が合うことを確かめる。

controller の 4 本に `@Query('include') include?: unknown, @Query('fields') fields?: unknown` を足して渡し、戻り値の型を合わせ、JSDoc に `` `fields` で返す項目を選べる（include は受けない。docs/adr/0010-v3-include-and-fields.md） `` を書く（JSDoc の無いメソッドには 1 行で足す）。

- [ ] **Step 5: 通ることを確かめる**

Run: `npx vitest run src/libs/operation-sighting/ --reporter=default`
Expected: PASS

- [ ] **Step 6: コミット**

```bash
git add src/libs/operation-sighting/
git commit -m "feat: :sparkles: 目撃情報の時刻断面に fields を足す"
```

---

### Task 8: ADR と全体の確かめ

**Files:**
- Modify: `docs/adr/0010-v3-include-and-fields.md`

- [ ] **Step 1: ADR に PR 2 の決めごとを足す**

`docs/adr/0010-v3-include-and-fields.md` の「決定」の節の末尾（なければ本文の末尾）に、次の節を足す（周りの見出しの深さ・言い方に合わせる）:

```markdown
### PR 2（2026-10-24）: 計算した応答の口

- 計算した DTO を返す口は、SQL を変えず、作った DTO を木に沿って削る。目撃の `from/to`（引き継いだ目撃を計算で足す）と read-model の口（運用の現在位置・つながり・次の運用の候補、目撃の時刻断面）がこれにあたる
- read-model の口は `parseFieldsOnly` で読む。`include` は空でも 400。関連はすべて返し、`fields` に挙げた資源だけ項目を削る（挙げない資源は全項目。`fields` だけのときに required の資源を ID だけにする決まりは使わない）
- DTO を削る木では、`operationId`・`formationId` の別名は DTO の同じ名前の項目を指す。今の応答に無い項目は足さない
- 引き継いだ目撃の `sightedAsOperation` は外せない（required で全項目を alwaysKeys）
- trip-blocks の崩れた `fields` も、`include` と同じく 400 にした（PR 1 までは DTO の検めで 422）
- 運用 `next-operation-candidates` の「駅が無ければ空」は、`fields` を検めてから返すよう service へ移した
```

- [ ] **Step 2: 全体を確かめる**

Run（サンドボックスの外）:
- `npx vitest run --reporter=default` → 全部 PASS
- `npm run build` → 成功
- `npx eslint "src/**/*.ts"` → 0 件（`npm run lint` は rtk 経由だと `.context/` を拾って落ちるので使わない）
- 足した・変えたファイルだけ `npx prettier --check <ファイル>`。崩れていれば `npx prettier --write <ファイル>`（ディレクトリ単位で流さない）

- [ ] **Step 3: コミット**

```bash
git add docs/adr/0010-v3-include-and-fields.md
git commit -m "docs: :memo: 計算した応答の口の include と fields を ADR に書き足す"
```

（Step 2 で整形したファイルがあれば、それは別に `style: :art: …` でコミットする）

---

### Task 9: 手元の API と本番の突き合わせ（controller が行う）

- 手元の API（このブランチ）と本番（v4.1.1 か v4.2.0）で、PR 2 の 14 本の口の「指定なし」の応答がバイト一致することを確かめる（目撃・現在位置は時刻で変わるので、`searchTime` を固定し、目撃は過去の日付にする）
- 主な口で、`include`・`fields` を付けたときの大きさと待ち時間を測る（編成 `as/of`・運用 `from/to`・時刻断面のまとめ・現在位置のまとめ）
- 400 の文言を確かめる（read-model の `include`、trip-blocks の崩れた `fields`）
- 台本は `/home/seapolis/Projects/sotetsu-lab-v3/.context/ssr-plan/` に置く（PR 1 の `include-fields-compare.mjs` に倣う）
