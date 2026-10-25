# v3 include・fields PR 3（残り全部）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** v3 の残りの読み取りの口に `include`・`fields`（結合の無い口は `fields` だけ）を足し、spec の 5 節 PR 3 を終える。

**Architecture:** PR 1・PR 2 の部品（`src/core/utils/selection/`）をそのまま使い、部品には手を入れない。重い口（路線一覧 140KB、駅別の列車 2.29MB、列車ブロック 1 件）は PR 1 と同じく SQL の列と結合を絞る。路線や事業者に運行系統・路線の駅の項目を足して作る口（`routes/:id/stations`、`services/:id/agencies`、`services/:id/routes`）は、PR 2 の目撃 `from/to` と同じく、作った DTO を木に沿って削る（`include` も受ける）。結合の無い口（ダイヤ 3 本、ダイヤの例外日、事業者、種別、駅、運行系統の一覧、ダイヤ内の運用）は `parseFieldsOnly` で読み、作った DTO を削る。

**Tech Stack:** NestJS 12・TypeORM 1.x（`createQueryBuilder`）・Vitest＋SWC・TypeScript strict・ESM

**Spec:** `docs/superpowers/specs/2026-10-24-v3-include-fields-design.md`（ADR: `docs/adr/0010-v3-include-and-fields.md`）

## Global Constraints

- 指定（`include`・`fields`）が無いときの応答は 1 バイトも変えない。既存の query・builder・DTO の全部入りの道には手を入れない。例外は 2 つ:
  - 駅別の列車の「駅に停まる時刻」の条件文字列を、同じ文字列のままモジュールの定数に出す（Task 5）
  - 列車ブロック一覧の選択の道（PR 1）の結合を private メソッドに切り出す（Task 6。これも選択の道で、全部入りの道ではない）
- 400 の文言は PR 1・PR 2 の `parseSelection`・`parseFieldsOnly` のものをそのまま使う。新しい文言は足さない
- `src/core/utils/selection/` には手を入れない
- ESM: 相対 import には `.js` を付ける。`src/…` の絶対 import は使わない
- query は `createQueryBuilder` だけで書く（`find`・`findOne` を新たに使わない）
- TypeScript strict。`as any`・`@ts-ignore` は使わない（spec の中の既存の `AnyMock` の書き方は除く）。spec で mock を型に合わせるときは `as unknown as X`
- lodash は使わない
- テストは SWC を使うので、Claude Code のサンドボックスの外で流す（`npx vitest run <パス> --reporter=default`）
- service は、DB に触る前に `include`・`fields` を検める（崩れた指定は query を呼ばずに 400）
- 資源ごとの列の定数は、その資源のドメインの `usecase/*-selection-columns.ts` に置く。1 つの木の中で同じ資源の `columns` は同じにする（`defineSelectionTree` が食い違いを投げる）
- DTO を削る木では、別名の列（`operationId`）は DTO の同じ名前のプロパティを指す（`operationId: 'operationId'`）
- 結合の無い口の木は、根の資源 1 つ（`relations` なし）・`alwaysKeys: ['id']`
- controller は `@Query('include') include?: unknown, @Query('fields') fields?: unknown` を足して service に渡すだけ。戻り値の型は `X | Record<string, unknown>`（配列なら `X[] | Record<string, unknown>[]`）。メソッドの上に 1 行の doc コメントを付ける:
  - `include`・`fields` を受ける口: `/** \`include\`・\`fields\` で返す関連・列を選べる（docs/adr/0010-v3-include-and-fields.md） */`
  - `fields` だけの口: `/** \`fields\` で返す列を選べる（docs/adr/0010-v3-include-and-fields.md） */`
- prettier の `--write` は、基点のコミットで既に整形済みだったファイルにだけかける（`npx prettier --check <ファイル>` を基点で確かめる）。未整形のファイルは自分が足した行だけ周りに合わせる
- コミット: Conventional Commits＋絵文字（例 `feat: :sparkles: …`）。ドメイン名は日本語（calendar → ダイヤ、calendar-date → ダイヤの例外日、agency → 事業者、trip-class → 種別、station → 駅、service → 運行系統、route → 路線、trip → 列車、trip-block → 列車ブロック、operation → 運用）。GPG 署名があるのでサンドボックスの外で `git commit`。本文の末尾に次の 2 行

  ```
  Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01FZB1eB3dTj4GQVxda71thf
  ```
- コメントの量と言葉づかいは周りのコードに合わせる（日本語・短く）
- ブランチは `feat/v3-include-fields-pr3`。push・PR は作らない（controller が行う）

## Review Focus

1. **結合の無い口に空の `include` を付けた**: `include=` でも 400 `この口は include を指定できない`。query は呼ばれない。→ Task 1・2 の service spec
2. **1 件の口で見つからない**: `fields` を付けても、ダイヤ `:id` は `null`、ダイヤ `as/of` は `undefined`、列車ブロック `:id` は `null` のまま（今と同じ空の応答）。`routes/:id/stations`・`services/:id/routes` は 404 のまま。→ Task 1・3・6 の spec
3. **作った応答の口で `fields` だけ**: `services/:id/agencies?fields[service]=serviceName` なら、外せない事業者（agencies）は `id` だけになる（ADR-0002 からの「fields だけ」の決まり）。→ Task 3 の service spec
4. **駅別の列車で時刻を返さない**: 時刻を結合しなくても、並びは今と同じくその駅の時刻順（絞り込み用の `stationTime` の結合と並べ替えは常にする）。→ Task 5 の query spec
5. **ダイヤ内の運用の `operationId`**: `fields[operation]=operationNumber` なら `operationId` は出ない。`fields[operation]=operationId` で DTO の `operationId` が返る。→ Task 2 の service spec

---

## File Structure

| ファイル | 役目 |
|---|---|
| Modify `src/libs/calendar/usecase/calendar-selection-columns.ts` | `CALENDAR_DATE_COLUMNS` を足す |
| Create `src/libs/calendar/usecase/calendar-selection.ts` | ダイヤ・ダイヤの例外日の木 |
| Modify calendar の service 2 本・controller 2 本と spec | ダイヤ 3 本・例外日 |
| Create `src/libs/agency/usecase/agency-selection.ts`・`src/libs/trip-class/usecase/trip-class-selection.ts`・`src/libs/station/usecase/station-selection.ts`・`src/libs/service/usecase/service-selection.ts`・`src/libs/operation/usecase/operations-by-calendar-selection.ts` | 結合の無い口の木 |
| Modify agency・trip-class・station・service・operation の service・controller と spec | 結合の無い口 5 本 |
| Create `src/libs/route/usecase/route-selection.ts` | 路線の駅一覧・路線一覧の木 |
| Modify `src/libs/service/usecase/service-selection.ts` | 運行系統の事業者・路線の木 |
| Modify route・service の service・controller と spec | 作った応答の口 3 本 |
| Modify `src/libs/route/infrastructure/queries/route.query.ts`（＋新しい spec） | 路線一覧の選択の取得 |
| Create `src/libs/trip/usecase/trips-by-station-selection.ts` | 駅別の列車の木 |
| Modify trip の query・service・controller（＋新しい spec） | 駅別の列車 |
| Modify trip-block の query・service・controller と spec | 列車ブロック 1 件 |
| Modify `docs/adr/0010-v3-include-and-fields.md`・spec の 4.5 節 | PR 3 の決めごと |

---

### Task 1: ダイヤ 3 本・ダイヤの例外日（`fields` だけ）

**Files:**
- Modify: `src/libs/calendar/usecase/calendar-selection-columns.ts`
- Create: `src/libs/calendar/usecase/calendar-selection.ts`
- Modify: `src/libs/calendar/usecase/calendar.v3.service.ts`、`src/libs/calendar/usecase/calendar-date.v3.service.ts`
- Modify: `src/libs/calendar/presentation/calendar.v3.controller.ts`、`src/libs/calendar/presentation/calendar-date.v3.controller.ts`
- Test: Create `src/libs/calendar/usecase/calendar.v3.service.spec.ts`、Modify `src/libs/calendar/usecase/calendar-date.v3.service.spec.ts`

**Interfaces:**
- Consumes: `parseFieldsOnly(query, tree): Selection | undefined`（`core/utils/selection/parse-selection.js`）、`serializeSelection(source, node, selection): Record<string, unknown>`（`serialize-selection.js`）、`defineSelectionTree`（`selection-tree.js`）、`CALENDAR_COLUMNS`
- Produces:
  - `CALENDAR_DATE_COLUMNS`
  - `CALENDAR_SELECTION_TREE`・`CALENDAR_DATE_SELECTION_TREE`
  - `CalendarV3Service.findMany(params: { serviceName?: string; include?: unknown; fields?: unknown }): Promise<CalendarDetailsDto[] | Record<string, unknown>[]>`
  - `CalendarV3Service.findOne(params: { id: string; include?: unknown; fields?: unknown }): Promise<CalendarDetailsDto | Record<string, unknown> | null>`
  - `CalendarV3Service.findOneBySpecificDate(params: { date: string; include?: unknown; fields?: unknown }): Promise<CalendarDetailsDto | Record<string, unknown> | undefined>`
  - `CalendarDateV3Service.findMany(params: { calendarId?: string; from?: string; to?: string; include?: unknown; fields?: unknown }): Promise<CalendarDateDetailsDto[] | Record<string, unknown>[]>`

- [ ] **Step 1: 列と木を作る**

`src/libs/calendar/usecase/calendar-selection-columns.ts` の末尾に足す:

```ts

/** `fields[calendarDate]` で選べる列 */
export const CALENDAR_DATE_COLUMNS = columnsOf(
    'id',
    'calendarId',
    'date',
    'exceptionType',
    'memo',
    'createdAt',
    'updatedAt',
);
```

`src/libs/calendar/usecase/calendar-selection.ts`:

```ts
import { defineSelectionTree } from '../../../core/utils/selection/selection-tree.js';
import {
    CALENDAR_COLUMNS,
    CALENDAR_DATE_COLUMNS,
} from './calendar-selection-columns.js';

/**
 * `GET /v3/calendars`・`/as/of/:date`・`/:id` の `fields` で選べる範囲
 * （docs/adr/0010-v3-include-and-fields.md）。結合が無いので include は受けない。
 */
export const CALENDAR_SELECTION_TREE = defineSelectionTree({
    resource: 'calendar',
    columns: CALENDAR_COLUMNS,
    alwaysKeys: ['id'],
});

/** `GET /v3/calendar-dates` の `fields` で選べる範囲 */
export const CALENDAR_DATE_SELECTION_TREE = defineSelectionTree({
    resource: 'calendarDate',
    columns: CALENDAR_DATE_COLUMNS,
    alwaysKeys: ['id'],
});
```

- [ ] **Step 2: service の spec を書く**

`src/libs/calendar/usecase/calendar.v3.service.spec.ts`:

```ts
import { BadRequestException } from '@nestjs/common';
import type { CalendarQuery } from '../infrastructure/queries/calendar.query.js';
import { CalendarV3Service } from './calendar.v3.service.js';

const calendar = {
    id: 'c1',
    serviceId: 's1',
    calendarName: '平日',
    monday: true,
    endDate: null,
};

describe('CalendarV3Service - fields', () => {
    const query = {
        findManyByServiceName: vi.fn(),
        findOneById: vi.fn(),
        findOneBySpecificDate: vi.fn(),
    };
    const service = new CalendarV3Service(query as unknown as CalendarQuery);

    beforeEach(() => {
        vi.clearAllMocks();
        query.findManyByServiceName.mockResolvedValue([calendar]);
        query.findOneById.mockResolvedValue(calendar);
        query.findOneBySpecificDate.mockResolvedValue(calendar);
    });

    it('一覧: 指定が無ければ今の応答をそのまま返す', async () => {
        const result = await service.findMany({ serviceName: '相鉄線' });

        expect(query.findManyByServiceName).toHaveBeenCalledWith({
            serviceName: '相鉄線',
        });
        expect(result).toEqual([calendar]);
    });

    it('一覧: fields[calendar] の項目と id だけを返し、null は省く', async () => {
        const result = await service.findMany({
            fields: { calendar: 'calendarName,endDate' },
        });

        expect(result).toEqual([{ id: 'c1', calendarName: '平日' }]);
    });

    it('一覧: include は空でも 400 で、query を呼ばない', async () => {
        await expect(service.findMany({ include: '' })).rejects.toThrow(
            new BadRequestException('この口は include を指定できない'),
        );
        expect(query.findManyByServiceName).not.toHaveBeenCalled();
    });

    it('一覧: 木に無い項目は 400', async () => {
        await expect(
            service.findMany({ fields: { calendar: 'password' } }),
        ).rejects.toThrow(
            new BadRequestException(
                'fields[calendar] に指定できない項目: password',
            ),
        );
    });

    it(':id: fields で削り、見つからなければ null のまま', async () => {
        await expect(
            service.findOne({ id: 'c1', fields: { calendar: 'monday' } }),
        ).resolves.toEqual({ id: 'c1', monday: true });

        query.findOneById.mockResolvedValue(null);
        await expect(
            service.findOne({ id: 'x', fields: { calendar: 'monday' } }),
        ).resolves.toBeNull();
        expect(query.findOneById).toHaveBeenLastCalledWith({ id: 'x' });
    });

    it('as/of: fields で削り、見つからなければ undefined のまま', async () => {
        await expect(
            service.findOneBySpecificDate({
                date: '2026-10-25',
                fields: { calendar: 'calendarName' },
            }),
        ).resolves.toEqual({ id: 'c1', calendarName: '平日' });

        query.findOneBySpecificDate.mockResolvedValue(undefined);
        await expect(
            service.findOneBySpecificDate({
                date: '2026-10-25',
                fields: { calendar: 'calendarName' },
            }),
        ).resolves.toBeUndefined();
        expect(query.findOneBySpecificDate).toHaveBeenLastCalledWith({
            date: '2026-10-25',
        });
    });
});
```

`src/libs/calendar/usecase/calendar-date.v3.service.spec.ts` の、既存の `describe` の中の最後の `it` の後ろに足す（既存の `findMany` mock と `service` を使う。import に `BadRequestException` が無ければ `@nestjs/common` から足す）:

```ts
    it('findMany は fields[calendarDate] の項目と id だけを返す', async () => {
        findMany.mockResolvedValue([
            { id: 'a', date: '2026-11-03', exceptionType: 1, memo: null },
        ]);

        const result = await service.findMany({
            calendarId: 'calendar-1',
            fields: { calendarDate: 'date,memo' },
        });

        expect(findMany).toHaveBeenCalledWith({ calendarId: 'calendar-1' });
        expect(result).toEqual([{ id: 'a', date: '2026-11-03' }]);
    });

    it('findMany は include を 400 にし、query を呼ばない', async () => {
        await expect(service.findMany({ include: '' })).rejects.toThrow(
            new BadRequestException('この口は include を指定できない'),
        );
        expect(findMany).not.toHaveBeenCalled();
    });
```

- [ ] **Step 3: spec が落ちるのを確かめる**

Run: `npx vitest run src/libs/calendar/usecase --reporter=default`
Expected: FAIL（`fields` が無視されて全項目が返る、include で 400 にならない）

- [ ] **Step 4: service を書く**

`src/libs/calendar/usecase/calendar.v3.service.ts` を次にする:

```ts
import { Injectable } from '@nestjs/common';
import { parseFieldsOnly } from '../../../core/utils/selection/parse-selection.js';
import { serializeSelection } from '../../../core/utils/selection/serialize-selection.js';
import { CalendarQuery } from '../infrastructure/queries/calendar.query.js';
import { CALENDAR_SELECTION_TREE } from './calendar-selection.js';
import { CalendarDetailsDto } from './dtos/calendar-details.dto.js';

@Injectable()
export class CalendarV3Service {
    constructor(private readonly calendarQuery: CalendarQuery) {}

    /** `fields` があれば選んだ列だけを返す（docs/adr/0010-v3-include-and-fields.md） */
    async findMany(params: {
        serviceName?: string;
        include?: unknown;
        fields?: unknown;
    }): Promise<CalendarDetailsDto[] | Record<string, unknown>[]> {
        const { serviceName, include, fields } = params;
        const selection = parseFieldsOnly(
            { include, fields },
            CALENDAR_SELECTION_TREE,
        );
        const result = await this.calendarQuery.findManyByServiceName({
            serviceName,
        });
        if (!selection) return result;
        return result.map((o) =>
            serializeSelection(o, CALENDAR_SELECTION_TREE, selection),
        );
    }

    async findOne(params: {
        id: string;
        include?: unknown;
        fields?: unknown;
    }): Promise<CalendarDetailsDto | Record<string, unknown> | null> {
        const { id, include, fields } = params;
        const selection = parseFieldsOnly(
            { include, fields },
            CALENDAR_SELECTION_TREE,
        );
        const result = await this.calendarQuery.findOneById({ id });
        if (!selection || !result) return result;
        return serializeSelection(result, CALENDAR_SELECTION_TREE, selection);
    }

    async findOneBySpecificDate(params: {
        date: string;
        include?: unknown;
        fields?: unknown;
    }): Promise<CalendarDetailsDto | Record<string, unknown> | undefined> {
        const { date, include, fields } = params;
        const selection = parseFieldsOnly(
            { include, fields },
            CALENDAR_SELECTION_TREE,
        );
        const result = await this.calendarQuery.findOneBySpecificDate({
            date,
        });
        if (!selection || !result) return result;
        return serializeSelection(result, CALENDAR_SELECTION_TREE, selection);
    }
}
```

`src/libs/calendar/usecase/calendar-date.v3.service.ts` の `findMany` を次にする（import に `parseFieldsOnly`・`serializeSelection`・`CALENDAR_DATE_SELECTION_TREE` を足す。`create`・`deleteOneById` は触らない）:

```ts
    /** `fields` があれば選んだ列だけを返す（docs/adr/0010-v3-include-and-fields.md） */
    async findMany(params: {
        calendarId?: string;
        from?: string;
        to?: string;
        include?: unknown;
        fields?: unknown;
    }): Promise<CalendarDateDetailsDto[] | Record<string, unknown>[]> {
        const { calendarId, from, to, include, fields } = params;
        const selection = parseFieldsOnly(
            { include, fields },
            CALENDAR_DATE_SELECTION_TREE,
        );
        const result = await this.calendarDateQuery.findMany({
            calendarId,
            from,
            to,
        });
        if (!selection) return result;
        return result.map((o) =>
            serializeSelection(o, CALENDAR_DATE_SELECTION_TREE, selection),
        );
    }
```

- [ ] **Step 5: controller を書く**

`calendar.v3.controller.ts` の 3 本の GET に `@Query('include') include?: unknown, @Query('fields') fields?: unknown` を足し、service に `{ serviceName, include, fields }`・`{ date, include, fields }`・`{ id, include, fields }` を渡す。戻り値の型は `Promise<CalendarDetailsDto[] | Record<string, unknown>[]>`・`Promise<CalendarDetailsDto | Record<string, unknown> | undefined>`・`Promise<CalendarDetailsDto | Record<string, unknown> | null>`。各メソッドの上に `fields` だけの口の doc コメント（Global Constraints）。

`calendar-date.v3.controller.ts` の `findMany` も同じく 2 つの `@Query` を足し、`{ calendarId, from, to, include, fields }` を渡す。戻り値の型は `Promise<CalendarDateDetailsDto[] | Record<string, unknown>[]>`。`post`・`delete` は触らない。

- [ ] **Step 6: spec と型を通す**

Run: `npx vitest run src/libs/calendar --reporter=default`
Expected: PASS

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: エラーなし

- [ ] **Step 7: Commit**

```bash
git add src/libs/calendar
git commit -m "feat: :sparkles: ダイヤとダイヤの例外日の読み取りで fields を受ける" -m "<Global Constraints の 2 行>"
```

---

### Task 2: 事業者・種別・駅・運行系統の一覧・ダイヤ内の運用（`fields` だけ）

**Files:**
- Create: `src/libs/agency/usecase/agency-selection.ts`、`src/libs/trip-class/usecase/trip-class-selection.ts`、`src/libs/station/usecase/station-selection.ts`、`src/libs/service/usecase/service-selection.ts`、`src/libs/operation/usecase/operations-by-calendar-selection.ts`
- Modify: `src/libs/agency/usecase/agency.v3.service.ts`、`src/libs/trip-class/usecase/trip-class.v3.service.ts`、`src/libs/station/usecase/station.v3.service.ts`、`src/libs/service/usecase/service.v3.service.ts`（`findMany` だけ）、`src/libs/operation/usecase/operation.v3.service.ts`（`findManyByCalendarId` だけ）
- Modify: 各ドメインの `presentation/*.v3.controller.ts` の該当メソッド
- Test: Create `src/libs/agency/usecase/agency.v3.service.spec.ts`、`src/libs/trip-class/usecase/trip-class.v3.service.spec.ts`、`src/libs/station/usecase/station.v3.service.spec.ts`。Modify `src/libs/service/usecase/service.v3.service.spec.ts`、`src/libs/operation/usecase/operation.v3.service.spec.ts`

**Interfaces:**
- Consumes: `parseFieldsOnly`・`serializeSelection`・`defineSelectionTree`、`AGENCY_COLUMNS`・`TRIP_CLASS_COLUMNS`・`STATION_COLUMNS`・`SERVICE_COLUMNS`・`OPERATION_COLUMNS`
- Produces:
  - `AGENCY_SELECTION_TREE`・`TRIP_CLASS_SELECTION_TREE`・`STATION_SELECTION_TREE`・`SERVICE_SELECTION_TREE`・`OPERATIONS_BY_CALENDAR_SELECTION_TREE`
  - `AgencyV3Service.findAll(params?: { include?: unknown; fields?: unknown }): Promise<AgencyDetailsDto[] | Record<string, unknown>[]>`
  - `TripClassV3Service.findMany(params?: { serviceId?: string; include?: unknown; fields?: unknown }): Promise<TripClassDetailsDto[] | Record<string, unknown>[]>`
  - `StationV3Service.findAll(params?: { include?: unknown; fields?: unknown }): Promise<StationDetailsDto[] | Record<string, unknown>[]>`
  - `ServiceV3Service.findMany(params?: { serviceName?: string; include?: unknown; fields?: unknown }): Promise<ServiceDetailsDto[] | Record<string, unknown>[]>`
  - `OperationV3Service.findManyByCalendarId(params: { calendarId: string; include?: unknown; fields?: unknown }): Promise<OperationDetailsDto[] | Record<string, unknown>[]>`
  - Task 3 は `service-selection.ts` に木を足す

- [ ] **Step 1: 木を作る**

`src/libs/agency/usecase/agency-selection.ts`:

```ts
import { defineSelectionTree } from '../../../core/utils/selection/selection-tree.js';
import { AGENCY_COLUMNS } from './agency-selection-columns.js';

/** `GET /v3/agencies` の `fields` で選べる範囲（docs/adr/0010-v3-include-and-fields.md）。結合が無いので include は受けない */
export const AGENCY_SELECTION_TREE = defineSelectionTree({
    resource: 'agency',
    columns: AGENCY_COLUMNS,
    alwaysKeys: ['id'],
});
```

`src/libs/trip-class/usecase/trip-class-selection.ts`:

```ts
import { defineSelectionTree } from '../../../core/utils/selection/selection-tree.js';
import { TRIP_CLASS_COLUMNS } from './trip-class-selection-columns.js';

/** `GET /v3/trip-classes` の `fields` で選べる範囲（docs/adr/0010-v3-include-and-fields.md）。結合が無いので include は受けない */
export const TRIP_CLASS_SELECTION_TREE = defineSelectionTree({
    resource: 'tripClass',
    columns: TRIP_CLASS_COLUMNS,
    alwaysKeys: ['id'],
});
```

`src/libs/station/usecase/station-selection.ts`:

```ts
import { defineSelectionTree } from '../../../core/utils/selection/selection-tree.js';
import { STATION_COLUMNS } from './station-selection-columns.js';

/** `GET /v3/stations` の `fields` で選べる範囲（docs/adr/0010-v3-include-and-fields.md）。結合が無いので include は受けない */
export const STATION_SELECTION_TREE = defineSelectionTree({
    resource: 'station',
    columns: STATION_COLUMNS,
    alwaysKeys: ['id'],
});
```

`src/libs/service/usecase/service-selection.ts`:

```ts
import { defineSelectionTree } from '../../../core/utils/selection/selection-tree.js';
import { SERVICE_COLUMNS } from './service-selection-columns.js';

/** `GET /v3/services` の `fields` で選べる範囲（docs/adr/0010-v3-include-and-fields.md）。結合が無いので include は受けない */
export const SERVICE_SELECTION_TREE = defineSelectionTree({
    resource: 'service',
    columns: SERVICE_COLUMNS,
    alwaysKeys: ['id'],
});
```

`src/libs/operation/usecase/operations-by-calendar-selection.ts`:

```ts
import { defineSelectionTree } from '../../../core/utils/selection/selection-tree.js';
import { OPERATION_COLUMNS } from './operation-selection-columns.js';

/**
 * `GET /v3/operations/calendar/:calendarId` の `fields` で選べる範囲
 * （docs/adr/0010-v3-include-and-fields.md）。結合が無いので include は受けない。
 * 作った DTO を削るので、operationId は DTO の同じ名前の項目を指す。
 */
export const OPERATIONS_BY_CALENDAR_SELECTION_TREE = defineSelectionTree({
    resource: 'operation',
    columns: { ...OPERATION_COLUMNS, operationId: 'operationId' },
    alwaysKeys: ['id'],
});
```

- [ ] **Step 2: service の spec を書く**

`src/libs/agency/usecase/agency.v3.service.spec.ts`:

```ts
import { BadRequestException } from '@nestjs/common';
import type { AgencyQuery } from '../infrastructure/queries/agency.query.js';
import { AgencyV3Service } from './agency.v3.service.js';

describe('AgencyV3Service - fields', () => {
    const agency = { id: 'a1', agencyName: '相鉄', agencyUrl: null };
    const query = { findAll: vi.fn() };
    const service = new AgencyV3Service(query as unknown as AgencyQuery);

    beforeEach(() => {
        vi.clearAllMocks();
        query.findAll.mockResolvedValue([agency]);
    });

    it('指定が無ければ今の応答をそのまま返す', async () => {
        await expect(service.findAll()).resolves.toEqual([agency]);
    });

    it('fields[agency] の項目と id だけを返す', async () => {
        await expect(
            service.findAll({ fields: { agency: 'agencyName,agencyUrl' } }),
        ).resolves.toEqual([{ id: 'a1', agencyName: '相鉄' }]);
    });

    it('include は空でも 400 で、query を呼ばない', async () => {
        await expect(service.findAll({ include: '' })).rejects.toThrow(
            new BadRequestException('この口は include を指定できない'),
        );
        expect(query.findAll).not.toHaveBeenCalled();
    });
});
```

`src/libs/trip-class/usecase/trip-class.v3.service.spec.ts`:

```ts
import { BadRequestException } from '@nestjs/common';
import type { TripClassQuery } from '../infrastructure/queries/trip-class.query.js';
import { TripClassV3Service } from './trip-class.v3.service.js';

describe('TripClassV3Service - fields', () => {
    const tripClass = { id: 'k1', tripClassName: '各停', sequence: 1 };
    const query = { findMany: vi.fn() };
    const service = new TripClassV3Service(
        query as unknown as TripClassQuery,
    );

    beforeEach(() => {
        vi.clearAllMocks();
        query.findMany.mockResolvedValue([tripClass]);
    });

    it('指定が無ければ今の応答をそのまま返す', async () => {
        await expect(service.findMany({ serviceId: 's1' })).resolves.toEqual([
            tripClass,
        ]);
        expect(query.findMany).toHaveBeenCalledWith({ serviceId: 's1' });
    });

    it('fields[tripClass] の項目と id だけを返す', async () => {
        await expect(
            service.findMany({ fields: { tripClass: 'tripClassName' } }),
        ).resolves.toEqual([{ id: 'k1', tripClassName: '各停' }]);
    });

    it('include は 400 で、query を呼ばない', async () => {
        await expect(service.findMany({ include: 'service' })).rejects.toThrow(
            new BadRequestException('この口は include を指定できない'),
        );
        expect(query.findMany).not.toHaveBeenCalled();
    });
});
```

`src/libs/station/usecase/station.v3.service.spec.ts`:

```ts
import { BadRequestException } from '@nestjs/common';
import type { StationQuery } from '../infrastructure/queries/station.query.js';
import { StationV3Service } from './station.v3.service.js';

describe('StationV3Service - fields', () => {
    const station = { id: 'st1', stationName: '二俣川', stationSubname: null };
    const query = { findAll: vi.fn() };
    const service = new StationV3Service(query as unknown as StationQuery);

    beforeEach(() => {
        vi.clearAllMocks();
        query.findAll.mockResolvedValue([station]);
    });

    it('指定が無ければ今の応答をそのまま返す', async () => {
        await expect(service.findAll()).resolves.toEqual([station]);
    });

    it('fields[station] の項目と id だけを返し、null は省く', async () => {
        await expect(
            service.findAll({
                fields: { station: 'stationName,stationSubname' },
            }),
        ).resolves.toEqual([{ id: 'st1', stationName: '二俣川' }]);
    });

    it('include は空でも 400 で、query を呼ばない', async () => {
        await expect(service.findAll({ include: '' })).rejects.toThrow(
            new BadRequestException('この口は include を指定できない'),
        );
        expect(query.findAll).not.toHaveBeenCalled();
    });
});
```

`src/libs/service/usecase/service.v3.service.spec.ts` の末尾に足す（既存の mock の作り方に合わせる。mock の `ServiceQuery` に `findManyByServiceName` が無ければ足す。既存の spec が Nest の testing module で `service` を作っているなら、それを使ってよい）:

```ts
describe('ServiceV3Service - 一覧の fields', () => {
    const query = { findManyByServiceName: vi.fn() };
    const service = new ServiceV3Service(query as unknown as ServiceQuery);

    beforeEach(() => {
        vi.clearAllMocks();
        query.findManyByServiceName.mockResolvedValue([
            { id: 's1', serviceName: '相鉄線', serviceDescription: null },
        ]);
    });

    it('指定が無ければ今の取得をそのまま返す', async () => {
        await service.findMany({ serviceName: '相鉄線' });
        expect(query.findManyByServiceName).toHaveBeenCalledWith({
            serviceName: '相鉄線',
        });
    });

    it('fields[service] の項目と id だけを返す', async () => {
        await expect(
            service.findMany({ fields: { service: 'serviceName' } }),
        ).resolves.toEqual([{ id: 's1', serviceName: '相鉄線' }]);
    });

    it('include は 400 で、query を呼ばない', async () => {
        await expect(service.findMany({ include: '' })).rejects.toThrow(
            new BadRequestException('この口は include を指定できない'),
        );
        expect(query.findManyByServiceName).not.toHaveBeenCalled();
    });
});
```

`src/libs/operation/usecase/operation.v3.service.spec.ts` の `describe('findManyByCalendarId', …)` の中の最後の `it` の後ろに足す（既存の `service`・`mockOperationQuery` を使う）:

```ts
        it('fields[operation] の項目と id だけを返す。operationId は挙げたときだけ', async () => {
            mockOperationQuery.findManyByCalendarId.mockResolvedValue([
                {
                    id: 'o1',
                    operationId: 'o1',
                    calendarId: 'c1',
                    operationNumber: '11',
                },
            ]);

            await expect(
                service.findManyByCalendarId({
                    calendarId: 'c1',
                    fields: { operation: 'operationNumber' },
                }),
            ).resolves.toEqual([{ id: 'o1', operationNumber: '11' }]);
            await expect(
                service.findManyByCalendarId({
                    calendarId: 'c1',
                    fields: { operation: 'operationId' },
                }),
            ).resolves.toEqual([{ id: 'o1', operationId: 'o1' }]);
            expect(mockOperationQuery.findManyByCalendarId).toHaveBeenCalledWith(
                { calendarId: 'c1' },
            );
        });

        it('include は 400 で、query を呼ばない', async () => {
            await expect(
                service.findManyByCalendarId({ calendarId: 'c1', include: '' }),
            ).rejects.toThrow(
                new BadRequestException('この口は include を指定できない'),
            );
            expect(mockOperationQuery.findManyByCalendarId).not.toHaveBeenCalled();
        });
```

- [ ] **Step 3: spec が落ちるのを確かめる**

Run: `npx vitest run src/libs/agency src/libs/trip-class src/libs/station src/libs/service/usecase src/libs/operation/usecase/operation.v3.service.spec.ts --reporter=default`
Expected: FAIL

- [ ] **Step 4: service を書く**

5 本とも同じ形にする。DB に触る前に検め、指定が無ければ今の結果をそのまま返す。

`agency.v3.service.ts` の `findAll`:

```ts
    /** `fields` があれば選んだ列だけを返す（docs/adr/0010-v3-include-and-fields.md） */
    async findAll(
        params: { include?: unknown; fields?: unknown } = {},
    ): Promise<AgencyDetailsDto[] | Record<string, unknown>[]> {
        const selection = parseFieldsOnly(params, AGENCY_SELECTION_TREE);
        const result = await this.agencyQuery.findAll();
        if (!selection) return result;
        return result.map((o) =>
            serializeSelection(o, AGENCY_SELECTION_TREE, selection),
        );
    }
```

`station.v3.service.ts` の `findAll` は `agency` と同じ形（`StationDetailsDto`・`STATION_SELECTION_TREE`・`this.stationQuery.findAll()`）。

`trip-class.v3.service.ts` の `findMany`:

```ts
    /** `fields` があれば選んだ列だけを返す（docs/adr/0010-v3-include-and-fields.md） */
    async findMany(
        params: { serviceId?: string; include?: unknown; fields?: unknown } = {},
    ): Promise<TripClassDetailsDto[] | Record<string, unknown>[]> {
        const { serviceId, include, fields } = params;
        const selection = parseFieldsOnly(
            { include, fields },
            TRIP_CLASS_SELECTION_TREE,
        );
        const result = await this.tripClassQuery.findMany({ serviceId });
        if (!selection) return result;
        return result.map((o) =>
            serializeSelection(o, TRIP_CLASS_SELECTION_TREE, selection),
        );
    }
```

`service.v3.service.ts` の `findMany` は `trip-class` と同じ形（`serviceName`・`ServiceDetailsDto`・`SERVICE_SELECTION_TREE`・`this.serviceQuery.findManyByServiceName({ serviceName })`）。ほかのメソッドは触らない。

`operation.v3.service.ts` の `findManyByCalendarId`:

```ts
    /** `fields` があれば選んだ列だけを返す（docs/adr/0010-v3-include-and-fields.md） */
    async findManyByCalendarId(params: {
        calendarId: string;
        include?: unknown;
        fields?: unknown;
    }): Promise<OperationDetailsDto[] | Record<string, unknown>[]> {
        const { calendarId, include, fields } = params;
        const tree = OPERATIONS_BY_CALENDAR_SELECTION_TREE;
        const selection = parseFieldsOnly({ include, fields }, tree);
        const result = await this.operationQuery.findManyByCalendarId({
            calendarId,
        });
        if (!selection) return result;
        return result.map((o) => serializeSelection(o, tree, selection));
    }
```

import は各ファイルで足す（`parseFieldsOnly` は `core/utils/selection/parse-selection.js`、`serializeSelection` は `core/utils/selection/serialize-selection.js`。既に import 済みなら足さない）。

- [ ] **Step 5: controller を書く**

各 controller の該当メソッドに `@Query('include') include?: unknown, @Query('fields') fields?: unknown` を足して渡し、戻り値の型を `X[] | Record<string, unknown>[]` にし、`fields` だけの口の doc コメントを付ける。`Query` の import が無い controller（agency・station）は足す。

- agency: `findAll(@Query('include') include?: unknown, @Query('fields') fields?: unknown)` → `this.agencyV3Service.findAll({ include, fields })`
- station: 同じ
- trip-class: `findMany(@Query('serviceId') serviceId?: string, @Query('include') …, @Query('fields') …)` → `findMany({ serviceId, include, fields })`
- service: `findMany` → `findMany({ serviceName, include, fields })`
- operation: `findManyByCalendarId` → `findManyByCalendarId({ calendarId, include, fields })`。`/groups` は触らない（Task 7 の ADR に理由を書く）

- [ ] **Step 6: spec と型を通す**

Run: `npx vitest run src/libs/agency src/libs/trip-class src/libs/station src/libs/service src/libs/operation --reporter=default`
Expected: PASS

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: エラーなし

- [ ] **Step 7: Commit**

```bash
git add src/libs/agency src/libs/trip-class src/libs/station src/libs/service src/libs/operation
git commit -m "feat: :sparkles: 事業者・種別・駅・運行系統・ダイヤ内の運用の一覧で fields を受ける" -m "<Global Constraints の 2 行>"
```

---

### Task 3: 路線の駅一覧・運行系統の事業者・運行系統の路線（作った応答を削る）

**Files:**
- Create: `src/libs/route/usecase/route-selection.ts`
- Modify: `src/libs/service/usecase/service-selection.ts`（Task 2 で作ったもの）
- Modify: `src/libs/route/usecase/route.v3.service.ts`（`findOneWithStations`）、`src/libs/service/usecase/service.v3.service.ts`（`findOneWithAgencies`・`findOneWithRoutes`）
- Modify: `src/libs/route/presentation/route.v3.controller.ts`（`findOneWithStations`）、`src/libs/service/presentation/service.v3.controller.ts`（`findOneServiceWithAgencies`・`findOneServiceWithRoutes`）
- Test: Create `src/libs/route/usecase/route.v3.service.spec.ts`、Modify `src/libs/service/usecase/service.v3.service.spec.ts`

**Interfaces:**
- Consumes: `parseSelection(query, tree): Selection | undefined`、`serializeSelection`、`defineSelectionTree`・`columnsOf`、`ROUTE_COLUMNS`・`STATION_COLUMNS`・`SERVICE_COLUMNS`・`AGENCY_COLUMNS`
- Produces:
  - `ROUTE_STATIONS_SELECTION_TREE`（`route-selection.ts`。Task 4 が同じファイルに `ROUTES_SELECTION_TREE` を足す）
  - `SERVICE_AGENCIES_SELECTION_TREE`・`SERVICE_ROUTES_SELECTION_TREE`
  - `RouteV3Service.findOneWithStations(params: { routeId: string; include?: unknown; fields?: unknown }): Promise<RouteStationsDto | Record<string, unknown>>`
  - `ServiceV3Service.findOneWithAgencies(params: { serviceId: string; include?: unknown; fields?: unknown }): Promise<ServiceAgenciesDto | Record<string, unknown>>`
  - `ServiceV3Service.findOneWithRoutes(params: { serviceId: string; include?: unknown; fields?: unknown }): Promise<ServiceRoutesDto | Record<string, unknown>>`

3 本とも、SQL は今のまま、作った DTO を木に沿って削る。応答は `{ route, stations }`・`{ service, agencies }`・`{ service, routes }` で、駅・事業者・路線の配列は外せない（required）。`include=` なら `route`・`service` を出さない。駅と路線には運行系統・路線の駅の項目が足されているので、その木の中でだけ `fields[station]`・`fields[route]` で選べる項目を足す。

- [ ] **Step 1: 木を作る**

`src/libs/route/usecase/route-selection.ts`:

```ts
import {
    columnsOf,
    defineSelectionTree,
} from '../../../core/utils/selection/selection-tree.js';
import { STATION_COLUMNS } from '../../station/usecase/station-selection-columns.js';
import { ROUTE_COLUMNS } from './route-selection-columns.js';

/**
 * `GET /v3/routes/:id/stations` の `include`・`fields` で選べる範囲
 * （docs/adr/0010-v3-include-and-fields.md）。作った応答を削る。駅（stations）は外せない。
 * 駅には路線の駅の並びと駅番号が足されているので、`fields[station]` でも選べる。
 */
export const ROUTE_STATIONS_SELECTION_TREE = defineSelectionTree({
    resource: null,
    columns: {},
    relations: {
        route: {
            property: 'route',
            many: false,
            resource: 'route',
            columns: ROUTE_COLUMNS,
            alwaysKeys: ['id'],
        },
        stations: {
            property: 'stations',
            many: true,
            required: true,
            resource: 'station',
            columns: {
                ...STATION_COLUMNS,
                ...columnsOf('stationSequence', 'stationNumbering'),
            },
            alwaysKeys: ['id'],
        },
    },
});
```

`src/libs/service/usecase/service-selection.ts` を次にする（Task 2 の `SERVICE_SELECTION_TREE` はそのまま残す）:

```ts
import {
    columnsOf,
    defineSelectionTree,
} from '../../../core/utils/selection/selection-tree.js';
import { AGENCY_COLUMNS } from '../../agency/usecase/agency-selection-columns.js';
import { ROUTE_COLUMNS } from '../../route/usecase/route-selection-columns.js';
import { SERVICE_COLUMNS } from './service-selection-columns.js';

/** `GET /v3/services` の `fields` で選べる範囲（docs/adr/0010-v3-include-and-fields.md）。結合が無いので include は受けない */
export const SERVICE_SELECTION_TREE = defineSelectionTree({
    resource: 'service',
    columns: SERVICE_COLUMNS,
    alwaysKeys: ['id'],
});

const SERVICE_RELATION = {
    property: 'service',
    many: false,
    resource: 'service',
    columns: SERVICE_COLUMNS,
    alwaysKeys: ['id'],
} as const;

/** `GET /v3/services/:id/agencies` の `include`・`fields` で選べる範囲。作った応答を削る。事業者（agencies）は外せない */
export const SERVICE_AGENCIES_SELECTION_TREE = defineSelectionTree({
    resource: null,
    columns: {},
    relations: {
        service: SERVICE_RELATION,
        agencies: {
            property: 'agencies',
            many: true,
            required: true,
            resource: 'agency',
            columns: AGENCY_COLUMNS,
            alwaysKeys: ['id'],
        },
    },
});

/**
 * `GET /v3/services/:id/routes` の `include`・`fields` で選べる範囲。作った応答を削る。路線（routes）は外せない。
 * 路線には運行系統の並びと始終点が足されているので、`fields[route]` でも選べる。
 */
export const SERVICE_ROUTES_SELECTION_TREE = defineSelectionTree({
    resource: null,
    columns: {},
    relations: {
        service: SERVICE_RELATION,
        routes: {
            property: 'routes',
            many: true,
            required: true,
            resource: 'route',
            columns: {
                ...ROUTE_COLUMNS,
                ...columnsOf(
                    'sequence',
                    'startRouteStationListId',
                    'endRouteStationListId',
                ),
            },
            alwaysKeys: ['id'],
        },
    },
});
```

- [ ] **Step 2: service の spec を書く**

`src/libs/route/usecase/route.v3.service.spec.ts`:

```ts
import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { RouteQuery } from '../infrastructure/queries/route.query.js';
import { RouteV3Service } from './route.v3.service.js';

const routeStations = {
    route: { id: 'r1', routeName: '本線', routeColor: null },
    stations: [
        {
            id: 'st1',
            stationName: '横浜',
            stationSequence: 1,
            stationNumbering: 'SO01',
        },
    ],
};

describe('RouteV3Service - 駅一覧の include・fields', () => {
    const query = {
        findOneWithStations: vi.fn(),
        findManyByServiceName: vi.fn(),
        findManyByServiceNameWithSelection: vi.fn(),
    };
    const service = new RouteV3Service(query as unknown as RouteQuery);

    beforeEach(() => {
        vi.clearAllMocks();
        query.findOneWithStations.mockResolvedValue(routeStations);
    });

    it('指定が無ければ今の応答をそのまま返す', async () => {
        await expect(
            service.findOneWithStations({ routeId: 'r1' }),
        ).resolves.toEqual(routeStations);
        expect(query.findOneWithStations).toHaveBeenCalledWith({
            routeId: 'r1',
        });
    });

    it('include= なら路線を出さず、駅は fields[station] で削る', async () => {
        await expect(
            service.findOneWithStations({
                routeId: 'r1',
                include: '',
                fields: { station: 'stationName,stationNumbering' },
            }),
        ).resolves.toEqual({
            stations: [
                { id: 'st1', stationName: '横浜', stationNumbering: 'SO01' },
            ],
        });
    });

    it('include=route なら路線も返し、null は省く', async () => {
        await expect(
            service.findOneWithStations({
                routeId: 'r1',
                include: 'route',
                fields: { route: 'routeName,routeColor', station: 'stationName' },
            }),
        ).resolves.toEqual({
            route: { id: 'r1', routeName: '本線' },
            stations: [{ id: 'st1', stationName: '横浜' }],
        });
    });

    it('木に無い道筋は 400 で、query を呼ばない', async () => {
        await expect(
            service.findOneWithStations({
                routeId: 'r1',
                include: 'stations.route',
            }),
        ).rejects.toThrow(
            new BadRequestException('include に指定できない道筋: stations.route'),
        );
        expect(query.findOneWithStations).not.toHaveBeenCalled();
    });

    it('見つからなければ指定があっても 404', async () => {
        query.findOneWithStations.mockResolvedValue(null);
        await expect(
            service.findOneWithStations({ routeId: 'x', include: '' }),
        ).rejects.toThrow(NotFoundException);
    });
});
```

`src/libs/service/usecase/service.v3.service.spec.ts` の末尾に足す（import に `NotFoundException` が無ければ足す）:

```ts
describe('ServiceV3Service - 事業者・路線の include・fields', () => {
    const query = {
        findOneWithAgencies: vi.fn(),
        findOneWithRoutes: vi.fn(),
    };
    const service = new ServiceV3Service(query as unknown as ServiceQuery);
    const serviceRow = { id: 's1', serviceName: '相鉄線', serviceDescription: null };

    beforeEach(() => {
        vi.clearAllMocks();
        query.findOneWithAgencies.mockResolvedValue({
            service: serviceRow,
            agencies: [{ id: 'a1', agencyName: '相鉄', agencyUrl: null }],
        });
        query.findOneWithRoutes.mockResolvedValue({
            service: serviceRow,
            routes: [
                {
                    id: 'r1',
                    routeName: '本線',
                    sequence: 1,
                    startRouteStationListId: 'rsl1',
                },
            ],
        });
    });

    it('事業者: 指定が無ければ今の応答をそのまま返す', async () => {
        const result = await service.findOneWithAgencies({ serviceId: 's1' });
        expect(result).toEqual({
            service: serviceRow,
            agencies: [{ id: 'a1', agencyName: '相鉄', agencyUrl: null }],
        });
        expect(query.findOneWithAgencies).toHaveBeenCalledWith({
            serviceId: 's1',
        });
    });

    it('事業者: include= なら運行系統を出さない', async () => {
        await expect(
            service.findOneWithAgencies({
                serviceId: 's1',
                include: '',
                fields: { agency: 'agencyName' },
            }),
        ).resolves.toEqual({ agencies: [{ id: 'a1', agencyName: '相鉄' }] });
    });

    it('事業者: fields[service] だけなら、外せない事業者は id だけ', async () => {
        await expect(
            service.findOneWithAgencies({
                serviceId: 's1',
                fields: { service: 'serviceName' },
            }),
        ).resolves.toEqual({
            service: { id: 's1', serviceName: '相鉄線' },
            agencies: [{ id: 'a1' }],
        });
    });

    it('路線: fields[route] で運行系統の並びも選べる', async () => {
        await expect(
            service.findOneWithRoutes({
                serviceId: 's1',
                include: '',
                fields: { route: 'routeName,sequence' },
            }),
        ).resolves.toEqual({
            routes: [{ id: 'r1', routeName: '本線', sequence: 1 }],
        });
    });

    it('路線: 崩れた include は 400 で、query を呼ばない', async () => {
        await expect(
            service.findOneWithRoutes({ serviceId: 's1', include: 'agencies' }),
        ).rejects.toThrow(
            new BadRequestException('include に指定できない道筋: agencies'),
        );
        expect(query.findOneWithRoutes).not.toHaveBeenCalled();
    });

    it('路線: 見つからなければ指定があっても 404', async () => {
        query.findOneWithRoutes.mockResolvedValue(null);
        await expect(
            service.findOneWithRoutes({ serviceId: 'x', include: '' }),
        ).rejects.toThrow(NotFoundException);
    });
});
```

- [ ] **Step 3: spec が落ちるのを確かめる**

Run: `npx vitest run src/libs/route src/libs/service/usecase --reporter=default`
Expected: FAIL

- [ ] **Step 4: service を書く**

`route.v3.service.ts` の `findOneWithStations` を次にする（`findMany` は Task 4 で触る。import に `parseSelection`・`serializeSelection`・`ROUTE_STATIONS_SELECTION_TREE`）:

```ts
    /** `include`・`fields` があれば選んだ関連・列だけを返す（docs/adr/0010-v3-include-and-fields.md） */
    async findOneWithStations(params: {
        routeId: string;
        include?: unknown;
        fields?: unknown;
    }): Promise<RouteStationsDto | Record<string, unknown>> {
        const { routeId, include, fields } = params;
        const tree = ROUTE_STATIONS_SELECTION_TREE;
        const selection = parseSelection({ include, fields }, tree);
        const result = await this.routeQuery.findOneWithStations({ routeId });

        if (!result) {
            throw new NotFoundException(`Route with ID "${routeId}" not found.`);
        }

        return selection ? serializeSelection(result, tree, selection) : result;
    }
```

`service.v3.service.ts` の `findOneWithAgencies`・`findOneWithRoutes` を次にする（import に `serializeSelection`・2 つの木。`parseSelection` は既にある）:

```ts
    /** `include`・`fields` があれば選んだ関連・列だけを返す（docs/adr/0010-v3-include-and-fields.md） */
    async findOneWithAgencies(params: {
        serviceId: string;
        include?: unknown;
        fields?: unknown;
    }): Promise<ServiceAgenciesDto | Record<string, unknown>> {
        const { serviceId, include, fields } = params;
        const tree = SERVICE_AGENCIES_SELECTION_TREE;
        const selection = parseSelection({ include, fields }, tree);
        const result = await this.serviceQuery.findOneWithAgencies({
            serviceId,
        });

        if (!result) {
            throw new NotFoundException(
                `Service with ID "${serviceId}" not found.`,
            );
        }

        return selection ? serializeSelection(result, tree, selection) : result;
    }

    /** `include`・`fields` があれば選んだ関連・列だけを返す（docs/adr/0010-v3-include-and-fields.md） */
    async findOneWithRoutes(params: {
        serviceId: string;
        include?: unknown;
        fields?: unknown;
    }): Promise<ServiceRoutesDto | Record<string, unknown>> {
        const { serviceId, include, fields } = params;
        const tree = SERVICE_ROUTES_SELECTION_TREE;
        const selection = parseSelection({ include, fields }, tree);
        const result = await this.serviceQuery.findOneWithRoutes({ serviceId });

        if (!result) {
            throw new NotFoundException(
                `Service with ID "${serviceId}" not found.`,
            );
        }

        return selection ? serializeSelection(result, tree, selection) : result;
    }
```

`ServiceAgenciesDto` の import を `./dtos/service-agencies.dto.js` から足す（`findOneWithAgencies` は今 `Promise<any>`。query は `any` を返すので、型はこれで通る）。

- [ ] **Step 5: controller を書く**

- `route.v3.controller.ts` の `findOneWithStations`: 2 つの `@Query` を足し、`{ routeId, include, fields }` を渡す。戻り値 `Promise<RouteStationsDto | Record<string, unknown>>`
- `service.v3.controller.ts` の `findOneServiceWithAgencies`・`findOneServiceWithRoutes`: 同じく足し、`{ serviceId, include, fields }` を渡す。戻り値 `Promise<ServiceAgenciesDto | Record<string, unknown>>`・`Promise<ServiceRoutesDto | Record<string, unknown>>`
- 3 本とも `include`・`fields` を受ける口の doc コメントを付ける

- [ ] **Step 6: spec と型を通す**

Run: `npx vitest run src/libs/route src/libs/service --reporter=default`
Expected: PASS

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: エラーなし

- [ ] **Step 7: Commit**

```bash
git add src/libs/route src/libs/service
git commit -m "feat: :sparkles: 路線の駅一覧と運行系統の事業者・路線で include・fields を受ける" -m "<Global Constraints の 2 行>"
```

---

### Task 4: 路線一覧（SQL を絞る）

**Files:**
- Modify: `src/libs/route/usecase/route-selection.ts`（Task 3 で作ったもの）
- Modify: `src/libs/route/infrastructure/queries/route.query.ts`
- Modify: `src/libs/route/usecase/route.v3.service.ts`（`findMany`）
- Modify: `src/libs/route/presentation/route.v3.controller.ts`（`findMany`）
- Test: Create `src/libs/route/infrastructure/queries/route.query.spec.ts`、Modify `src/libs/route/usecase/route.v3.service.spec.ts`

**Interfaces:**
- Consumes: `parseSelection`・`selectColumns(alias, node, selection): string[]`（`core/utils/selection/select-columns.js`）・`serializeSelection`・`Selection` 型、`ROUTE_COLUMNS`・`ROUTE_STATION_LIST_COLUMNS`・`STATION_COLUMNS`
- Produces:
  - `ROUTES_SELECTION_TREE`
  - `RouteQuery.findManyByServiceNameWithSelection(params: { serviceName?: string }, selection: Selection): Promise<Record<string, unknown>[]>`
  - `RouteV3Service.findMany(params?: { serviceName?: string; include?: unknown; fields?: unknown }): Promise<RouteDetailsDto[] | Record<string, unknown>[]>`

決まり:
- 路線の駅（`routeStationLists`）を結合するときだけ、今と同じく `routeStationLists.stationSequence` で並べる。結合しないときは並べない（全部入りも路線の並びは指定していない）
- `serviceName` の絞り込みの結合（運行系統・運行系統の親）は今と同じく常にする（選ばない）

- [ ] **Step 1: 木を足す**

`src/libs/route/usecase/route-selection.ts` の import に `ROUTE_STATION_LIST_COLUMNS` を足し（`./route-selection-columns.js` から）、末尾に足す:

```ts

/** `GET /v3/routes` の `include`・`fields` で選べる範囲（docs/adr/0010-v3-include-and-fields.md） */
export const ROUTES_SELECTION_TREE = defineSelectionTree({
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
});
```

- [ ] **Step 2: query の spec を書く**

`src/libs/route/infrastructure/queries/route.query.spec.ts`:

```ts
import type { MockedFunction } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { parseSelection } from '../../../../core/utils/selection/parse-selection.js';
import { ROUTES_SELECTION_TREE } from '../../usecase/route-selection.js';
import { RouteModel } from '../models/route.model.js';
import { RouteQuery } from './route.query.js';

type AnyMock = MockedFunction<(...args: any[]) => any>;

describe('RouteQuery - findManyByServiceNameWithSelection', () => {
    let qb: Record<string, AnyMock>;
    let query: RouteQuery;

    const select = (raw: { include?: unknown; fields?: unknown }) =>
        parseSelection(raw, ROUTES_SELECTION_TREE)!;

    beforeEach(async () => {
        qb = {};
        for (const method of [
            'select',
            'addSelect',
            'leftJoin',
            'innerJoin',
            'where',
            'orderBy',
        ]) {
            qb[method] = vi.fn().mockReturnValue(qb);
        }
        qb.getMany = vi.fn().mockResolvedValue([
            {
                id: 'r1',
                routeName: '本線',
                routeColor: null,
                routeStationLists: [
                    {
                        id: 'rsl1',
                        stationSequence: 1,
                        station: { id: 'st1', stationName: '横浜' },
                    },
                ],
            },
        ]);
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RouteQuery,
                {
                    provide: getRepositoryToken(RouteModel),
                    useValue: { createQueryBuilder: () => qb },
                },
            ],
        }).compile();
        query = module.get(RouteQuery);
    });

    it('include= なら路線の列だけを選び、結合も並べ替えもしない', async () => {
        const result = await query.findManyByServiceNameWithSelection(
            {},
            select({ include: '', fields: { route: 'routeName,routeColor' } }),
        );

        expect(qb.select).toHaveBeenCalledWith([
            'route.id',
            'route.routeName',
            'route.routeColor',
        ]);
        expect(qb.leftJoin).not.toHaveBeenCalled();
        expect(qb.orderBy).not.toHaveBeenCalled();
        expect(result).toEqual([{ id: 'r1', routeName: '本線' }]);
    });

    it('include=routeStationLists.station なら路線の駅と駅を結合し、駅の並びで並べる', async () => {
        const result = await query.findManyByServiceNameWithSelection(
            {},
            select({
                include: 'routeStationLists.station',
                fields: {
                    route: 'routeName',
                    routeStationList: 'stationSequence',
                    station: 'stationName',
                },
            }),
        );

        expect(qb.leftJoin).toHaveBeenCalledWith(
            'route.routeStationLists',
            'routeStationLists',
        );
        expect(qb.leftJoin).toHaveBeenCalledWith(
            'routeStationLists.station',
            'station',
        );
        expect(qb.addSelect).toHaveBeenCalledWith([
            'routeStationLists.id',
            'routeStationLists.stationSequence',
        ]);
        expect(qb.addSelect).toHaveBeenCalledWith([
            'station.id',
            'station.stationName',
        ]);
        expect(qb.orderBy).toHaveBeenCalledWith(
            'routeStationLists.stationSequence',
            'ASC',
        );
        expect(result).toEqual([
            {
                id: 'r1',
                routeName: '本線',
                routeStationLists: [
                    {
                        id: 'rsl1',
                        stationSequence: 1,
                        station: { id: 'st1', stationName: '横浜' },
                    },
                ],
            },
        ]);
    });

    it('serviceName があれば運行系統で絞る結合をする', async () => {
        await query.findManyByServiceNameWithSelection(
            { serviceName: '相鉄線' },
            select({ include: '' }),
        );

        expect(qb.innerJoin).toHaveBeenCalledWith(
            'route.operatingSystems',
            'operatingSystem',
        );
        expect(qb.innerJoin).toHaveBeenCalledWith(
            'operatingSystem.service',
            'service',
        );
        expect(qb.where).toHaveBeenCalledWith(
            'service.serviceName = :serviceName',
            { serviceName: '相鉄線' },
        );
    });
});
```

`src/libs/route/usecase/route.v3.service.spec.ts` の末尾に足す:

```ts
describe('RouteV3Service - 一覧の include・fields', () => {
    const query = {
        findOneWithStations: vi.fn(),
        findManyByServiceName: vi.fn().mockResolvedValue([]),
        findManyByServiceNameWithSelection: vi.fn().mockResolvedValue([]),
    };
    const service = new RouteV3Service(query as unknown as RouteQuery);

    beforeEach(() => vi.clearAllMocks());

    it('指定が無ければ今の取得', async () => {
        await service.findMany({ serviceName: '相鉄線' });
        expect(query.findManyByServiceName).toHaveBeenCalledWith({
            serviceName: '相鉄線',
        });
        expect(query.findManyByServiceNameWithSelection).not.toHaveBeenCalled();
    });

    it('指定があれば選択の取得', async () => {
        await service.findMany({ serviceName: '相鉄線', include: '' });
        expect(query.findManyByServiceNameWithSelection).toHaveBeenCalledWith(
            { serviceName: '相鉄線' },
            { paths: new Set(), fields: new Map() },
        );
    });

    it('崩れた指定は 400 で、query を呼ばない', async () => {
        await expect(
            service.findMany({ include: 'operatingSystems' }),
        ).rejects.toThrow(
            new BadRequestException('include に指定できない道筋: operatingSystems'),
        );
        expect(query.findManyByServiceName).not.toHaveBeenCalled();
        expect(query.findManyByServiceNameWithSelection).not.toHaveBeenCalled();
    });
});
```

- [ ] **Step 3: spec が落ちるのを確かめる**

Run: `npx vitest run src/libs/route --reporter=default`
Expected: FAIL（`findManyByServiceNameWithSelection` が無い）

- [ ] **Step 4: query を書く**

`route.query.ts` の import に足す:

```ts
import type { Selection } from '../../../../core/utils/selection/parse-selection.js';
import { selectColumns } from '../../../../core/utils/selection/select-columns.js';
import { serializeSelection } from '../../../../core/utils/selection/serialize-selection.js';
import { ROUTES_SELECTION_TREE } from '../../usecase/route-selection.js';
```

`findManyByServiceName` の後ろに足す:

```ts
    /**
     * `findManyByServiceName` と同じ条件で、`include`・`fields` で選んだ関連・列だけを返す
     * （docs/adr/0010-v3-include-and-fields.md）。駅の並びは路線の駅を結合するときだけ。
     */
    async findManyByServiceNameWithSelection(
        params: { serviceName?: string },
        selection: Selection,
    ): Promise<Record<string, unknown>[]> {
        const { serviceName } = params;
        const tree = ROUTES_SELECTION_TREE;
        const routeStationLists = tree.relations.routeStationLists;

        const qb = this.routeRepository
            .createQueryBuilder('route')
            .select(selectColumns('route', tree, selection));

        if (selection.paths.has('routeStationLists')) {
            qb.leftJoin('route.routeStationLists', 'routeStationLists')
                .addSelect(
                    selectColumns(
                        'routeStationLists',
                        routeStationLists,
                        selection,
                    ),
                )
                .orderBy('routeStationLists.stationSequence', 'ASC');
        }
        if (selection.paths.has('routeStationLists.station')) {
            qb.leftJoin('routeStationLists.station', 'station').addSelect(
                selectColumns(
                    'station',
                    routeStationLists.relations.station,
                    selection,
                ),
            );
        }
        if (serviceName) {
            qb.innerJoin('route.operatingSystems', 'operatingSystem')
                .innerJoin('operatingSystem.service', 'service')
                .where('service.serviceName = :serviceName', { serviceName });
        }

        const models = await qb.getMany();
        return models.map((model) =>
            serializeSelection(model, tree, selection),
        );
    }
```

- [ ] **Step 5: service と controller を書く**

`route.v3.service.ts` の `findMany` を次にする（import に `ROUTES_SELECTION_TREE` を足す）:

```ts
    /** `include`・`fields` があれば選んだ関連・列だけを返す（docs/adr/0010-v3-include-and-fields.md） */
    async findMany(
        params: { serviceName?: string; include?: unknown; fields?: unknown } = {},
    ): Promise<RouteDetailsDto[] | Record<string, unknown>[]> {
        const { serviceName, include, fields } = params;
        const selection = parseSelection(
            { include, fields },
            ROUTES_SELECTION_TREE,
        );
        return selection
            ? this.routeQuery.findManyByServiceNameWithSelection(
                  { serviceName },
                  selection,
              )
            : this.routeQuery.findManyByServiceName({ serviceName });
    }
```

`route.v3.controller.ts` の `findMany` に 2 つの `@Query` を足し、`{ serviceName, include, fields }` を渡す。戻り値 `Promise<RouteDetailsDto[] | Record<string, unknown>[]>`。`include`・`fields` を受ける口の doc コメントを付ける。

- [ ] **Step 6: spec と型を通す**

Run: `npx vitest run src/libs/route --reporter=default`
Expected: PASS

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: エラーなし

- [ ] **Step 7: Commit**

```bash
git add src/libs/route
git commit -m "feat: :sparkles: 路線の一覧で include・fields を受ける" -m "<Global Constraints の 2 行>"
```

---

### Task 5: 駅別の列車（SQL を絞る）

**Files:**
- Create: `src/libs/trip/usecase/trips-by-station-selection.ts`
- Modify: `src/libs/trip/infrastructure/queries/trip.query.ts`
- Modify: `src/libs/trip/usecase/trip.v3.service.ts`
- Modify: `src/libs/trip/presentation/trip.v3.controller.ts`
- Test: Create `src/libs/trip/infrastructure/queries/trip.query.spec.ts`、`src/libs/trip/usecase/trip.v3.service.spec.ts`

**Interfaces:**
- Consumes: `parseSelection`・`selectColumns`・`serializeSelection`・`Selection` 型、`TRIP_COLUMNS`・`TIME_COLUMNS`・`TRIP_OPERATION_LIST_COLUMNS`
- Produces:
  - `TRIPS_BY_STATION_SELECTION_TREE`
  - `TripQuery.findManyByStationIdWithSelection(params: { stationId: string; calendarId: string; tripDirection: number }, selection: Selection): Promise<Record<string, unknown>[]>`
  - `TripV3Service.findManyByStationId(params: { stationId: string; calendarId: string; tripDirection: number; include?: unknown; fields?: unknown }): Promise<TripDetailsDto[] | Record<string, unknown>[]>`

決まり:
- 「その駅に停まる時刻」で絞る `stationTime` の内部結合と、その時刻での 4 段の並べ替えは、選択に関わらず常にする（選ばない）
- 木は列車ブロック一覧（PR 1）の `trips` と同じ形にそろえる（列車は `id` を常に返す・時刻と運用区間には `alwaysKeys` を付けない）
- 条件の文字列は、全部入りの `findManyByStationId` と同じ文字列をモジュールの定数 `STOPS_AT_STATION` に出して両方で使う（文字列は 1 文字も変えない）

- [ ] **Step 1: 木を作る**

`src/libs/trip/usecase/trips-by-station-selection.ts`:

```ts
import { defineSelectionTree } from '../../../core/utils/selection/selection-tree.js';
import {
    TIME_COLUMNS,
    TRIP_COLUMNS,
    TRIP_OPERATION_LIST_COLUMNS,
} from './trip-selection-columns.js';

/**
 * `GET /v3/trips/station/:stationId` の `include`・`fields` で選べる範囲
 * （docs/adr/0010-v3-include-and-fields.md）。列車の id は常に返す。
 */
export const TRIPS_BY_STATION_SELECTION_TREE = defineSelectionTree({
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
        },
    },
});
```

- [ ] **Step 2: query の spec を書く**

`src/libs/trip/infrastructure/queries/trip.query.spec.ts`:

```ts
import type { MockedFunction } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { parseSelection } from '../../../../core/utils/selection/parse-selection.js';
import { TRIPS_BY_STATION_SELECTION_TREE } from '../../usecase/trips-by-station-selection.js';
import { TripModel } from '../models/trip.model.js';
import { TripQuery } from './trip.query.js';

type AnyMock = MockedFunction<(...args: any[]) => any>;

describe('TripQuery - findManyByStationIdWithSelection', () => {
    let qb: Record<string, AnyMock>;
    let query: TripQuery;
    const params = { stationId: 'st1', calendarId: 'c1', tripDirection: 0 };

    const select = (raw: { include?: unknown; fields?: unknown }) =>
        parseSelection(raw, TRIPS_BY_STATION_SELECTION_TREE)!;

    beforeEach(async () => {
        qb = {};
        for (const method of [
            'select',
            'addSelect',
            'innerJoin',
            'leftJoin',
            'where',
            'andWhere',
            'orderBy',
            'addOrderBy',
        ]) {
            qb[method] = vi.fn().mockReturnValue(qb);
        }
        qb.getMany = vi.fn().mockResolvedValue([
            {
                id: 't1',
                tripNumber: '1001',
                extraCalendarId: null,
                times: [{ id: 'tm1', stationId: 'st1', departureTime: '05:00:00' }],
                tripOperationLists: [{ id: 'tol1', operationId: 'o1' }],
            },
        ]);
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TripQuery,
                {
                    provide: getRepositoryToken(TripModel),
                    useValue: { createQueryBuilder: () => qb },
                },
            ],
        }).compile();
        query = module.get(TripQuery);
    });

    it('時刻を返さなくても、その駅の時刻で絞って並べる', async () => {
        const result = await query.findManyByStationIdWithSelection(
            params,
            select({ include: '', fields: { trip: 'tripNumber,extraCalendarId' } }),
        );

        expect(qb.select).toHaveBeenCalledWith(['trip.id', 'trip.tripNumber', 'trip.extraCalendarId']);
        expect(qb.innerJoin).toHaveBeenCalledWith(
            'trip.times',
            'stationTime',
            expect.stringContaining('stationTime.stationId = :stationId'),
            { stationId: 'st1' },
        );
        expect(qb.leftJoin).not.toHaveBeenCalled();
        expect(qb.where).toHaveBeenCalledWith('trip.calendarId = :calendarId', {
            calendarId: 'c1',
        });
        expect(qb.andWhere).toHaveBeenCalledWith(
            'trip.tripDirection = :tripDirection',
            { tripDirection: 0 },
        );
        expect(qb.orderBy).toHaveBeenCalledWith(
            'stationTime.arrivalDays',
            'ASC',
            'NULLS LAST',
        );
        expect(qb.addOrderBy).toHaveBeenCalledWith(
            'stationTime.departureTime',
            'ASC',
            'NULLS LAST',
        );
        expect(result).toEqual([{ id: 't1', tripNumber: '1001' }]);
    });

    it('fields[time] だけなら時刻を結合する', async () => {
        const result = await query.findManyByStationIdWithSelection(
            params,
            select({ fields: { time: 'stationId,departureTime' } }),
        );

        expect(qb.leftJoin).toHaveBeenCalledWith('trip.times', 'times');
        expect(qb.leftJoin).not.toHaveBeenCalledWith(
            'trip.tripOperationLists',
            'tripOperationLists',
        );
        expect(qb.addSelect).toHaveBeenCalledWith([
            'times.id',
            'times.stationId',
            'times.departureTime',
        ]);
        expect(result).toEqual([
            {
                id: 't1',
                tripNumber: '1001',
                times: [{ stationId: 'st1', departureTime: '05:00:00' }],
            },
        ]);
    });

    it('include=tripOperationLists なら運用区間を結合する', async () => {
        await query.findManyByStationIdWithSelection(
            params,
            select({ include: 'tripOperationLists', fields: { tripOperationList: 'operationId' } }),
        );

        expect(qb.leftJoin).toHaveBeenCalledWith(
            'trip.tripOperationLists',
            'tripOperationLists',
        );
        expect(qb.addSelect).toHaveBeenCalledWith([
            'tripOperationLists.id',
            'tripOperationLists.operationId',
        ]);
    });
});
```

2 つ目の `it` の期待値の `tripNumber: '1001'` は、`fields` に `trip` が無いので列車の全項目が返り、mock にある `tripNumber` が出るため（`extraCalendarId` は null なので省かれる）。

`src/libs/trip/usecase/trip.v3.service.spec.ts`:

```ts
import { BadRequestException } from '@nestjs/common';
import type { TripQuery } from '../infrastructure/queries/trip.query.js';
import { TripV3Service } from './trip.v3.service.js';

describe('TripV3Service - 駅別の include・fields', () => {
    const query = {
        findManyByStationId: vi.fn().mockResolvedValue([]),
        findManyByStationIdWithSelection: vi.fn().mockResolvedValue([]),
    };
    const service = new TripV3Service(query as unknown as TripQuery);
    const params = { stationId: 'st1', calendarId: 'c1', tripDirection: 0 };

    beforeEach(() => vi.clearAllMocks());

    it('指定が無ければ今の取得', async () => {
        await service.findManyByStationId(params);
        expect(query.findManyByStationId).toHaveBeenCalledWith(params);
        expect(query.findManyByStationIdWithSelection).not.toHaveBeenCalled();
    });

    it('指定があれば選択の取得', async () => {
        await service.findManyByStationId({ ...params, include: '' });
        expect(query.findManyByStationIdWithSelection).toHaveBeenCalledWith(
            params,
            { paths: new Set(), fields: new Map() },
        );
    });

    it('崩れた指定は 400 で、query を呼ばない', async () => {
        await expect(
            service.findManyByStationId({ ...params, include: 'tripClass' }),
        ).rejects.toThrow(
            new BadRequestException('include に指定できない道筋: tripClass'),
        );
        expect(query.findManyByStationId).not.toHaveBeenCalled();
        expect(query.findManyByStationIdWithSelection).not.toHaveBeenCalled();
    });
});
```

- [ ] **Step 3: spec が落ちるのを確かめる**

Run: `npx vitest run src/libs/trip --reporter=default`
Expected: FAIL

- [ ] **Step 4: query を書く**

`trip.query.ts`:
1. import に `Selection` 型・`selectColumns`・`serializeSelection`・`TRIPS_BY_STATION_SELECTION_TREE` を足す（パスは Task 4 の route.query と同じ形。木は `../../usecase/trips-by-station-selection.js`）
2. クラスの前に定数を置き、`findManyByStationId` の `innerJoin` の第 3 引数をこの定数にする（文字列は今のものを 1 文字も変えずに移す）:

```ts
/** その駅に停まる時刻（乗り降りできるか、時刻のある通過扱いでない停車） */
const STOPS_AT_STATION =
    'stationTime.stationId = :stationId AND (stationTime.pickupType = 0 OR stationTime.dropoffType = 0 OR (stationTime.pickupType = 1 AND stationTime.dropoffType = 1 AND (stationTime.departureTime IS NOT NULL OR stationTime.arrivalTime IS NOT NULL)))';
```

3. `findManyByStationId` の後ろに足す:

```ts
    /**
     * `findManyByStationId` と同じ条件・並びで、`include`・`fields` で選んだ関連・列だけを返す
     * （docs/adr/0010-v3-include-and-fields.md）。駅の時刻での絞り込みと並べ替えは常にする。
     */
    async findManyByStationIdWithSelection(
        params: { stationId: string; calendarId: string; tripDirection: number },
        selection: Selection,
    ): Promise<Record<string, unknown>[]> {
        const { stationId, calendarId, tripDirection } = params;
        const tree = TRIPS_BY_STATION_SELECTION_TREE;

        const qb = this.tripRepository
            .createQueryBuilder('trip')
            .select(selectColumns('trip', tree, selection))
            .innerJoin('trip.times', 'stationTime', STOPS_AT_STATION, {
                stationId,
            });

        if (selection.paths.has('times')) {
            qb.leftJoin('trip.times', 'times').addSelect(
                selectColumns('times', tree.relations.times, selection),
            );
        }
        if (selection.paths.has('tripOperationLists')) {
            qb.leftJoin(
                'trip.tripOperationLists',
                'tripOperationLists',
            ).addSelect(
                selectColumns(
                    'tripOperationLists',
                    tree.relations.tripOperationLists,
                    selection,
                ),
            );
        }

        const models = await qb
            .where('trip.calendarId = :calendarId', { calendarId })
            .andWhere('trip.tripDirection = :tripDirection', { tripDirection })
            .orderBy('stationTime.arrivalDays', 'ASC', 'NULLS LAST')
            .addOrderBy('stationTime.arrivalTime', 'ASC', 'NULLS LAST')
            .addOrderBy('stationTime.departureDays', 'ASC', 'NULLS LAST')
            .addOrderBy('stationTime.departureTime', 'ASC', 'NULLS LAST')
            .getMany();
        return models.map((model) =>
            serializeSelection(model, tree, selection),
        );
    }
```

- [ ] **Step 5: service と controller を書く**

`trip.v3.service.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { parseSelection } from '../../../core/utils/selection/parse-selection.js';
import { TripQuery } from '../infrastructure/queries/trip.query.js';
import { TripDetailsDto } from './dtos/trip-details.dto.js';
import { TRIPS_BY_STATION_SELECTION_TREE } from './trips-by-station-selection.js';

@Injectable()
export class TripV3Service {
    constructor(private readonly tripQuery: TripQuery) {}

    /** `include`・`fields` があれば選んだ関連・列だけを返す（docs/adr/0010-v3-include-and-fields.md） */
    async findManyByStationId(params: {
        stationId: string;
        calendarId: string;
        tripDirection: number;
        include?: unknown;
        fields?: unknown;
    }): Promise<TripDetailsDto[] | Record<string, unknown>[]> {
        const { stationId, calendarId, tripDirection, include, fields } =
            params;
        const selection = parseSelection(
            { include, fields },
            TRIPS_BY_STATION_SELECTION_TREE,
        );
        return selection
            ? this.tripQuery.findManyByStationIdWithSelection(
                  { stationId, calendarId, tripDirection },
                  selection,
              )
            : this.tripQuery.findManyByStationId({
                  stationId,
                  calendarId,
                  tripDirection,
              });
    }
}
```

`trip.v3.controller.ts` の `findManyByStationId` に `@Query('include') include?: unknown, @Query('fields') fields?: unknown` を `@Query() query` の後ろに足し、service に `include`・`fields` も渡す。戻り値 `Promise<TripDetailsDto[] | Record<string, unknown>[]>`。`include`・`fields` を受ける口の doc コメントを付ける。

- [ ] **Step 6: spec と型を通す**

Run: `npx vitest run src/libs/trip --reporter=default`
Expected: PASS（既存の `trip-find-many-by-station-id.query.spec.ts` も）

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: エラーなし

- [ ] **Step 7: Commit**

```bash
git add src/libs/trip
git commit -m "feat: :sparkles: 駅別の列車で include・fields を受ける" -m "<Global Constraints の 2 行>"
```

---

### Task 6: 列車ブロック 1 件（SQL を絞る）

**Files:**
- Modify: `src/libs/trip-block/infrastructure/queries/trip-block.query.ts`
- Modify: `src/libs/trip-block/usecase/trip-block.v3.service.ts`（`findOneById`）
- Modify: `src/libs/trip-block/presentation/trip-block.v3.controller.ts`（`findOneById`）
- Test: `src/libs/trip-block/infrastructure/queries/trip-block.query.spec.ts`、`src/libs/trip-block/usecase/trip-block.v3.service.spec.ts`、（呼び出しの引数を確かめていれば）`src/libs/trip-block/presentation/trip-block.v3.controller.spec.ts`

**Interfaces:**
- Consumes: PR 1 の `TRIP_BLOCK_SELECTION_TREE`（一覧と同じ木を使う）・`parseSelection`・`selectColumns`・`serializeSelection`
- Produces:
  - `TripBlockQuery.findOneByIdWithSelection(params: { id: string }, selection: Selection): Promise<Record<string, unknown> | null>`
  - `TripBlockV3Service.findOneById(params: { id: string; include?: unknown; fields?: unknown }): Promise<TripBlockDetailsDto | Record<string, unknown> | null>`

決まり:
- 一覧の `findManyByFilterWithSelection` の、`trips` の結合より後ろ（時刻・運用区間・運用・種別の結合と、時刻を返すときの並べ替え）を private の `#joinTripRelations(qb, selection)` に切り出し、一覧と 1 件の両方で使う。一覧の SQL は変えない
- 木の根（列車ブロック）の列は `id` だけなので、指定があるときの列車ブロックは `id` だけを返す（全部入りの `createdAt`・`updatedAt` は出ない。一覧と同じ）
- 見つからなければ `null`（今と同じ空の応答）
- service の `findOneById` は controller からしか呼ばれない（service の中の `this.tripBlockQuery.findOneById` は query の方なので触らない）

- [ ] **Step 1: query の spec を書く**

`trip-block.query.spec.ts` の `buildQueryBuilderMock` の method の配列に `'where'` を足し、`qb.getOne` も足す:

```ts
    qb.getOne = vi.fn().mockResolvedValue(getManyResult[0] ?? null);
```

ファイルの末尾に足す（`TripBlockQuery` の作り方は既存の `describe` の `beforeEach` に合わせる）:

```ts
describe('TripBlockQuery - findOneByIdWithSelection', () => {
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
                        tripNumber: '1001',
                        times: [{ id: 'tm1', departureTime: '05:00:00' }],
                        tripClass: { id: 'k1', tripClassName: '各停' },
                    },
                ],
            },
        ]);
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TripBlockQuery,
                {
                    provide: getRepositoryToken(TripBlockModel),
                    useValue: { createQueryBuilder: () => qb },
                },
            ],
        }).compile();
        query = module.get(TripBlockQuery);
    });

    it('id で絞り、列車だけなら時刻を結合も並べ替えもしない', async () => {
        const result = await query.findOneByIdWithSelection(
            { id: 'b1' },
            select({ include: '', fields: { trip: 'tripNumber' } }),
        );

        expect(qb.where).toHaveBeenCalledWith('tripBlock.id = :id', { id: 'b1' });
        expect(qb.innerJoin).not.toHaveBeenCalled();
        expect(qb.leftJoin).toHaveBeenCalledWith('tripBlock.trips', 'trips');
        expect(qb.leftJoin).not.toHaveBeenCalledWith('trips.times', 'times');
        expect(qb.orderBy).not.toHaveBeenCalled();
        expect(result).toEqual({
            id: 'b1',
            trips: [{ id: 't1', tripNumber: '1001' }],
        });
    });

    it('include=trips.times,trips.tripClass なら結合し、時刻で並べる', async () => {
        const result = await query.findOneByIdWithSelection(
            { id: 'b1' },
            select({
                include: 'trips.times,trips.tripClass',
                fields: {
                    trip: 'tripNumber',
                    time: 'departureTime',
                    tripClass: 'tripClassName',
                },
            }),
        );

        expect(qb.leftJoin).toHaveBeenCalledWith('trips.times', 'times');
        expect(qb.leftJoin).toHaveBeenCalledWith('trips.tripClass', 'tripClass');
        expect(qb.orderBy).toHaveBeenCalledWith(
            'times.departureDays',
            'ASC',
            'NULLS LAST',
        );
        expect(result).toEqual({
            id: 'b1',
            trips: [
                {
                    id: 't1',
                    tripNumber: '1001',
                    times: [{ departureTime: '05:00:00' }],
                    tripClass: { tripClassName: '各停' },
                },
            ],
        });
    });

    it('見つからなければ null', async () => {
        qb.getOne.mockResolvedValue(null);
        await expect(
            query.findOneByIdWithSelection({ id: 'x' }, select({ include: '' })),
        ).resolves.toBeNull();
    });
});
```

- [ ] **Step 2: service の spec を書く**

`trip-block.v3.service.spec.ts` の mock の `TripBlockQuery` に `findOneByIdWithSelection: vi.fn() as AnyMock,` を足し、`findManyByFilter` の選択を確かめている `describe` の後ろに足す（既存の `service`・`mockTripBlockQuery` の名前に合わせる）:

```ts
describe('TripBlockV3Service - findOneById の include・fields', () => {
    let service: TripBlockV3Service;

    beforeEach(async () => {
        vi.clearAllMocks();
        service = await buildService();
    });

    it('指定が無ければ今の取得', async () => {
        mockTripBlockQuery.findOneById.mockResolvedValue({ id: 'b1' });
        await expect(service.findOneById({ id: 'b1' })).resolves.toEqual({
            id: 'b1',
        });
        expect(mockTripBlockQuery.findOneById).toHaveBeenCalledWith({ id: 'b1' });
        expect(mockTripBlockQuery.findOneByIdWithSelection).not.toHaveBeenCalled();
    });

    it('指定があれば選択の取得', async () => {
        mockTripBlockQuery.findOneByIdWithSelection.mockResolvedValue({ id: 'b1' });
        await service.findOneById({
            id: 'b1',
            fields: { trip: 'tripNumber' },
        });
        expect(mockTripBlockQuery.findOneByIdWithSelection).toHaveBeenCalledWith(
            { id: 'b1' },
            {
                paths: new Set(['trips']),
                fields: new Map([['trip', new Set(['tripNumber'])]]),
            },
        );
    });

    it('崩れた指定は 400 で、query を呼ばない', async () => {
        await expect(
            service.findOneById({ id: 'b1', include: 'operation' }),
        ).rejects.toThrow(
            new BadRequestException('include に指定できない道筋: operation'),
        );
        expect(mockTripBlockQuery.findOneById).not.toHaveBeenCalled();
        expect(mockTripBlockQuery.findOneByIdWithSelection).not.toHaveBeenCalled();
    });
});
```

`buildService` が無い spec なら、既存の `describe` の `beforeEach` の作り方を写す。

- [ ] **Step 3: spec が落ちるのを確かめる**

Run: `npx vitest run src/libs/trip-block --reporter=default`
Expected: FAIL（`findOneByIdWithSelection` が無い）

- [ ] **Step 4: query を書く**

`trip-block.query.ts`:
1. import の `typeorm` に `SelectQueryBuilder` を足す
2. `findManyByFilterWithSelection` を次にする（`trips` の結合までは今と同じ。その後ろを `#joinTripRelations` に移す）:

```ts
    async findManyByFilterWithSelection(
        params: { calendarId: string; tripDirection: number },
        selection: Selection,
    ): Promise<Record<string, unknown>[]> {
        const { calendarId, tripDirection } = params;
        const tree = TRIP_BLOCK_SELECTION_TREE;

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
            .addSelect(selectColumns('trips', tree.relations.trips, selection));
        this.#joinTripRelations(qb, selection);

        const models = await qb.getMany();
        return models.map((model) =>
            serializeSelection(model, tree, selection),
        );
    }
```

3. `findOneById` の後ろに足す:

```ts
    /**
     * `findOneById` の、`include`・`fields` で選んだ関連・列だけを返す版
     * （docs/adr/0010-v3-include-and-fields.md）。一覧と同じ木を使う。
     */
    async findOneByIdWithSelection(
        params: { id: string },
        selection: Selection,
    ): Promise<Record<string, unknown> | null> {
        const { id } = params;
        const tree = TRIP_BLOCK_SELECTION_TREE;

        const qb = this.tripBlockRepository
            .createQueryBuilder('tripBlock')
            .select(selectColumns('tripBlock', tree, selection))
            .leftJoin('tripBlock.trips', 'trips')
            .addSelect(selectColumns('trips', tree.relations.trips, selection))
            .where('tripBlock.id = :id', { id });
        this.#joinTripRelations(qb, selection);

        const model = await qb.getOne();
        return model ? serializeSelection(model, tree, selection) : null;
    }

    /** 列車の下の関連のうち選ばれたものを結合する。時刻を返すときだけ時刻順に並べる */
    #joinTripRelations(
        qb: SelectQueryBuilder<TripBlockModel>,
        selection: Selection,
    ): void {
        const trips = TRIP_BLOCK_SELECTION_TREE.relations.trips;

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
                selectColumns(
                    'tripClass',
                    trips.relations.tripClass,
                    selection,
                ),
            );
        }
        if (selection.paths.has('trips.times')) {
            qb.orderBy('times.departureDays', 'ASC', 'NULLS LAST').addOrderBy(
                'times.departureTime',
                'ASC',
                'NULLS LAST',
            );
        }
    }
```

既存の一覧の spec（`findManyByFilterWithSelection`）が通ることで、切り出しで一覧の SQL が変わっていないことを確かめる。

- [ ] **Step 5: service と controller を書く**

`trip-block.v3.service.ts` の `findOneById` を次にする:

```ts
    /** `include`・`fields` があれば選んだ関連・列だけを返す（docs/adr/0010-v3-include-and-fields.md） */
    async findOneById(params: {
        id: string;
        include?: unknown;
        fields?: unknown;
    }): Promise<TripBlockDetailsDto | Record<string, unknown> | null> {
        const { id, include, fields } = params;
        const selection = parseSelection(
            { include, fields },
            TRIP_BLOCK_SELECTION_TREE,
        );
        return selection
            ? this.tripBlockQuery.findOneByIdWithSelection({ id }, selection)
            : this.tripBlockQuery.findOneById({ id });
    }
```

`trip-block.v3.controller.ts` の `findOneById` に `@Query('include') include?: unknown, @Query('fields') fields?: unknown` を足し、`{ id, include, fields }` を渡す。戻り値 `Promise<TripBlockDetailsDto | Record<string, unknown> | null>`。`include`・`fields` を受ける口の doc コメントを付ける。`trip-block.v3.controller.spec.ts` が `findOneById` の呼び出しの引数を確かめていれば、`{ id, include: undefined, fields: undefined }` に合わせる。

- [ ] **Step 6: spec と型を通す**

Run: `npx vitest run src/libs/trip-block --reporter=default`
Expected: PASS

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: エラーなし

- [ ] **Step 7: Commit**

```bash
git add src/libs/trip-block
git commit -m "feat: :sparkles: 列車ブロック 1 件の取得で include・fields を受ける" -m "<Global Constraints の 2 行>"
```

---

### Task 7: ADR-0010 と spec の口の表

**Files:**
- Modify: `docs/adr/0010-v3-include-and-fields.md`
- Modify: `docs/superpowers/specs/2026-10-24-v3-include-fields-design.md`（4.5 節の表）

**Interfaces:**
- Consumes: Task 1〜6 の結果
- Produces: なし

- [ ] **Step 1: ADR に PR 3 の節を足す**

`docs/adr/0010-v3-include-and-fields.md` の `### PR 2（2026-10-24）: 計算した応答の口` の節の最後の箇条の後ろ（`## 結果` の前）に足す:

```markdown

### PR 3（2026-10-25）: 残りの口

- 重い口（路線の一覧・駅別の列車・列車ブロック 1 件）は PR 1 と同じく SQL の列と結合を絞る。駅別の列車は、その駅の時刻での絞り込みと並べ替えの結合を常にする（返さないときも並びは今と同じ）
- 列車ブロック 1 件は一覧と同じ木を使う。根の列車ブロックの列は `id` だけなので、指定があるときは `createdAt`・`updatedAt` を返さない
- 路線の一覧は、路線の駅を結合するときだけ駅の並びで並べる（全部入りも路線の並びは指定していない）
- 路線や事業者に運行系統・路線の駅の項目を足して作る口（`routes/:id/stations`・`services/:id/agencies`・`services/:id/routes`）は、SQL を変えず作った DTO を削る。`include` で `route`・`service` を外せる。足された項目（駅の `stationSequence`・`stationNumbering`、路線の `sequence`・`startRouteStationListId`・`endRouteStationListId`）は、その口の木の中でだけ `fields[station]`・`fields[route]` で選べる
- 結合の無い口（ダイヤ 3 本・ダイヤの例外日・事業者・種別・駅・運行系統の一覧・ダイヤ内の運用）は `parseFieldsOnly` で読み、作った DTO を削る。どれもマスタで小さく、SQL を絞っても待ちは変わらない
- `operations/groups` は対象から外した。DB を読まない決まった表（372B・項目 2 つ）で、列を選んでも得るものが無い
```

- [ ] **Step 2: spec の 4.5 節の表を直す**

`docs/superpowers/specs/2026-10-24-v3-include-fields-design.md` の 4.5 節の表の「結合なし」の行の `operations（\`groups\`・\`calendar/:id\`）` を `operations（\`calendar/:id\`）` にし、表の直後の段落（`read-model と結合なしの口は …`）の後ろに 1 行足す:

```markdown

`operations/groups` は DB を読まない決まった表（項目 2 つ）なので対象から外した（PR 3 で確定。ADR-0010）。
```

- [ ] **Step 3: Commit**

```bash
git add docs/adr/0010-v3-include-and-fields.md docs/superpowers/specs/2026-10-24-v3-include-fields-design.md
git commit -m "docs: :memo: include・fields の PR 3 の決めごとを ADR に足す" -m "<Global Constraints の 2 行>"
```

---

## 全体の確かめ（controller が行う）

- `npx vitest run --reporter=default`・`npm run build`・`npx tsc --noEmit`・`npx eslint "src/**/*.ts"` をサンドボックスの外で流す
- 手元の API（本番 DB を読む）と本番 v4.1.1 以降を `.context/ssr-plan/include-fields-pr3-compare.mjs` で突き合わせる:
  - 指定なしの 16 本（路線 2・運行系統 3・駅別の列車・列車ブロック 1 件・ダイヤ 3・例外日・事業者・種別・駅・ダイヤ内の運用。`/groups` は変えていないので外す）がバイト一致
  - 駅別の列車・路線の一覧・駅の一覧の、指定ありの大きさと待ち（3 回の中央値）
  - 400 の文言（結合の無い口の `include=`、木に無い道筋、許可されていない項目）
