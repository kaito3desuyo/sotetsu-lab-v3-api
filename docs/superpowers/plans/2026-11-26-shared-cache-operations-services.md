# 運用の現在位置と種別・路線を共有キャッシュに通す Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `GET /v3/operations/current-positions`・`GET /v3/services/:id/stations`・`GET /v3/routes` の DB の読み取りを、共有キャッシュ（`SharedCache.getOrLoad`）越しにする。

**Architecture:** 今の `ItinerarySegmentReader`・trip-blocks の一覧と同じ使い方をする。`SharedCache` の作りは変えない。現在位置は DB から読んだモデルだけを置き、位置の計算は毎回する。

**Tech Stack:** NestJS 12・TypeScript strict・ESM・TypeORM 1.x・Vitest

**Spec:** `docs/superpowers/specs/2026-11-26-shared-cache-operations-services-design.md`（共有キャッシュの元の設計は ADR-0021）

## Global Constraints

- 名前空間は `operation-current-positions`・`service-stations`・`routes`
- 現在位置のキーは、運用の id を重ねずに並べ替えたもの。タグは `calendarCacheTags(<その運用のダイヤの id>)`。ダイヤは `SELECT DISTINCT calendar_id FROM operations WHERE id IN (...)` を `createQueryBuilder` で引く
- 現在位置で時刻（`searchTime`）はキーに入れない。位置の計算（`buildOperationCurrentPosition`）は、キャッシュから読んだモデルに対して毎回する
- 種別・路線のキーには `selectionCacheKey({ include, fields })` を入れる。タグは付けない（`tags: []`）
- 3 つとも、controller で `@Headers('cache-control')`・`@Headers('pragma')` を受け、`wantsFreshRead` の結果を `bypassCache` として usecase に渡し、`getOrLoad` の `bypass` にする（trip-blocks の一覧と同じ）
- 応答は、キャッシュに置く前と同じ JSON にする。`NotFoundException` などの振る舞いも変えない
- Query は `createQueryBuilder` で書く。相対 import は `.js` 付き。`as any`・`@ts-ignore` は使わない
- テストは SWC のためサンドボックス外で流す。一時ファイルは `.context/`

## Review Focus

1. キャッシュから読んだ現在位置のモデルは、`Date` が文字列になり、クラスの実体でもない。`buildOperationCurrentPosition` と応答の形が DB から読んだときと同じになる — Task 1 のテスト「JSON を通したモデルでも位置の計算の結果が同じ」
2. 同じ運用の集まりでも、id の順や重なりが違えば同じキーになる — Task 1 のテスト「id の順と重なりが違ってもキーが同じ」
3. id が空なら、ダイヤも引かず共有キャッシュにも行かない — Task 1 のテスト「id が空なら DB にもキャッシュにも行かない」
4. 存在しない種別の id は、キャッシュ越しでも `NotFoundException` になる — Task 2 のテスト
5. `serviceName` が無い `GET /v3/routes`（全部の路線）も、キーが決まって置ける — Task 2 のテスト「serviceName が無いときのキー」

---

### Task 1: 運用の現在位置

**Files:**
- Modify: `src/libs/operation/infrastructure/queries/operation.query.ts`（ダイヤの id を引く問い合わせを足す）と spec
- Create: `src/libs/operation/usecase/operation-current-position.reader.ts` と spec（`ItinerarySegmentReader` と同じ形）
- Modify: `src/libs/operation/usecase/operation.v3.service.ts`（`findManyWithCurrentPosition` が reader を使う）と spec
- Modify: `src/libs/operation/presentation/operation.v3.controller.ts`（`/current-positions` で bypass を受ける）
- Modify: reader を provider に足すモジュール（`OperationQuery` を提供しているもの。`SharedCacheModule` を import していなければ足す）

**Interfaces:**
- Produces: `OperationQuery.findCalendarIdsByOperationIds(params: { operationIds: string[] }): Promise<string[]>`
- Produces: `OperationCurrentPositionReader.findManyForCurrentPosition(params: { operationIds: string[]; bypass?: boolean }): Promise<OperationModel[]>` — 返す順は今の `OperationQuery.findManyForCurrentPosition` と同じ（要求の id の順）
- Produces: `OperationV3Service.findManyWithCurrentPosition` の引数に `bypassCache?: boolean` を足す

- [ ] **Step 1: 失敗するテストを書く**

reader の spec（`SharedCache` は `getOrLoad` を差し替え、`load` を呼んで返す偽物でよい）:

```ts
it('名前空間 operation-current-positions、キーは並べ替えて重ねない id、タグはダイヤから作る', ...);
// operationIds ['b','a','b'] → key に ['a','b'] が入る。findCalendarIdsByOperationIds が ['c1'] を返す → tags は calendarCacheTags(['c1'])
it('id の順と重なりが違ってもキーが同じ', ...);
it('id が空なら DB にもキャッシュにも行かない', ...);            // [] を返し、query も getOrLoad も呼ばない
it('bypass を getOrLoad に渡す', ...);
it('キャッシュの値は要求の id の順に並べて返す', ...);            // 置いた値の順と要求の順が違っても、要求の順。無い id は落とす
```

service の spec:

```ts
it('JSON を通したモデルでも位置の計算の結果が同じ', ...);
// 同じモデルを JSON.parse(JSON.stringify(...)) したものと、元のモデルとで、findManyWithCurrentPosition の結果（fields あり・無し）が toEqual
it('bypassCache を reader に渡す', ...);
```

query の spec に `findCalendarIdsByOperationIds` が DISTINCT の calendar_id を返すことを足す（既存の query の spec の書き方にそろえる）。

- [ ] **Step 2: 落ちるのを見る**

Run: `npx vitest run src/libs/operation`（dangerouslyDisableSandbox）
Expected: 足したテストが FAIL

- [ ] **Step 3: 実装する**

reader の `load` は `operationQuery.findManyForCurrentPosition({ operationIds: <並べ替えた id> })`。返す前に要求の id の順に並べ直す。タグを作るために、`getOrLoad` の前に `findCalendarIdsByOperationIds` を呼ぶ。

- [ ] **Step 4: 通るのを見る**

Run: `npx vitest run src/libs/operation src/libs/trip-block`。変えたファイルに `npx eslint` と `npx prettier --check`。
Expected: PASS

- [ ] **Step 5: コミット**

`perf: :zap: 運用の現在位置の読み取りを共有キャッシュに通す`

### Task 2: 種別の駅と路線

**Files:**
- Modify: `src/libs/service/usecase/service.v3.service.ts`（`findOneStations`）と spec
- Modify: `src/libs/route/usecase/route.v3.service.ts`（`findMany`）と spec
- Modify: `src/libs/service/presentation/service.v3.controller.ts`（`/:id/stations`）・`src/libs/route/presentation/route.v3.controller.ts`（`/`）で bypass を受ける
- Modify: service と route の v3 モジュールに `SharedCacheModule` を import する

**Interfaces:**
- Produces: `ServiceV3Service.findOneStations` と `RouteV3Service.findMany` の引数に `bypassCache?: boolean` を足す

- [ ] **Step 1: 失敗するテストを書く**

```ts
// service.v3.service.spec
it('名前空間 service-stations、キーは [serviceId, selectionCacheKey]、タグは無し', ...);
it('キャッシュ越しでも、無い種別は NotFoundException', ...);   // load が null → getOrLoad が null を返す → 投げる
it('bypassCache を getOrLoad の bypass に渡す', ...);
// route.v3.service.spec
it('名前空間 routes、キーは [serviceName, selectionCacheKey]、タグは無し', ...);
it('serviceName が無いときのキー', ...);                        // 空文字など、決まった値が入る
it('bypassCache を getOrLoad の bypass に渡す', ...);
```

- [ ] **Step 2: 落ちるのを見る**

Run: `npx vitest run src/libs/service src/libs/route`
Expected: 足したテストが FAIL

- [ ] **Step 3: 実装する**

`getOrLoad` の `load` に今の分岐（selection の有無）をそのまま入れる。`findOneStations` は `getOrLoad` の結果が null なら今と同じ `NotFoundException` を投げる。

- [ ] **Step 4: 通るのを見る**

Run: `npx vitest run src/libs/service src/libs/route`。変えたファイルに `npx eslint` と `npx prettier --check`。
Expected: PASS

- [ ] **Step 5: コミット**

`perf: :zap: 種別の駅と路線の読み取りを共有キャッシュに通す`

### Task 3: 記録

**Files:**
- Modify: `docs/adr/0021-shared-read-cache.md`（節を足す）
- Modify: `CLAUDE.md` の「共有キャッシュ」の行

- [ ] **Step 1: ADR-0021 に節を足す**

見出し「運用の現在位置と種別・路線も通す（2026-11-26 追記）」。spec の表（回数・行数）、3 つの名前空間とキー・タグ、現在位置で時刻をキーにしない理由、基本のデータはタグ無しで SQL で直したら `npm run cli -- shared-cache invalidate --namespace service-stations --namespace routes` で捨てること（ユーザーの判断）を、常体で短く書く

- [ ] **Step 2: CLAUDE.md に足す**

「共有キャッシュ」の行の末尾に「種別・路線などの基本のデータは api に書き込みの口が無いのでタグを付けない。SQL で直したら名前空間で捨てる」の旨を 1 文で

- [ ] **Step 3: コミット**

`docs: :memo: 運用の現在位置と種別・路線を共有キャッシュに通したことを ADR に足す`

### Task 4: 手元の通し（コントローラーがやる・コミットなし）

- [ ] DynamoDB Local の `local-shared-cache-table` に向けて手元の api を起動し、3 つの口を 2 回ずつ呼ぶ。2 回目に、それぞれの重い問い合わせの回数が pg_stat_statements で増えないこと、応答が 1 回目と同じ大きさであることを見る
- [ ] trip-blocks を書き換える口か CLI の `--tag calendar:<id>` で捨てた後、現在位置が 1 回だけ取り直されることを見る
