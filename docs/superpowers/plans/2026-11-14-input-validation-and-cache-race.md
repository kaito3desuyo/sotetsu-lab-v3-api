# 入力の検証と最新キャッシュの競合 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 日付・期間・時刻・番号の並びを受ける口で、不正な値を 500 でなく 422 にして、期間と件数に上限を置く。同じ編成への同時の投稿・無効化・復元で、投稿が消えたり最新キャッシュが古い目撃を指したりしないようにする。

**Architecture:** 入力は `usecase/params/*.param.ts` の Param クラスで受け、グローバルの `ValidationPipe`（失敗は 422）で検証する。共通の検証は `src/core/validators/` に置く。最新キャッシュを触る 3 つの書き込み（投稿・無効化・復元）は、トランザクションの中で編成番号ごとの advisory lock を取ってから、キャッシュと目撃を読み直して判断する。

**Tech Stack:** NestJS 12.2・class-validator・class-transformer・TypeORM 1.1（Postgres・プール `max: 1`）・dayjs・Vitest（SWC。サンドボックスの外で流す）。

**Spec:** spec は書かない。決めたことはこの計画に書く。元の指摘は `../.context/review-2026-11-12/api.md` の S1・S2・M2・M3（リポジトリの外。2026-11-12 の全体レビュー）。上限を決めた材料は `../sotetsu-lab-v3-client/.context/c-inventory.md`（2026-11-14 の調べ）。

## なぜ直すか

- 目撃の期間一覧（`/v3/operation-sightings/from/:start/to/:end`）は、`start`・`end` を素の文字列で受ける。`garbage` を渡すと `dayjs(...).toISOString()` が `RangeError` を投げ、500 になる。期間の長さに上限が無く、`includeCarriedOver=true` だと目撃のある日ごとにダイヤを直列に引く。ゲストのトークンで叩けて、3 秒の Lambda と DB を使い切れる。
- 同じ形の素の文字列が、運用・編成の期間、`calendar-dates`、`as/of/:date` の 2 口、`searchTime` の 6 口、番号の並び 3 口にある。
- 投稿はキャッシュをトランザクションの外で読んでから、トランザクションで書く。キャッシュの無い編成に 2 人が同時に投稿すると、両方が insert を選び、後の方が一意索引（`formation_number`）に当たって投稿ごと 500 で消える。キャッシュがあるときは、遅く commit した方が古い時刻で上書きしうる。無効化・復元も同じ形。
- `POST /v3/trip-blocks/bulk` の配列 body は、Nest の `ValidationPipe` が型 `Array` を検証しないので、中身が一切検証されない。
- 有効な目撃に `restore` を当てると、domain の素の `Error` が 500 になる。
- キャッシュが壊れたときに作り直す `rebuild-latest-cache` は、表が空でないと一意索引に当たって動かない。

## 決めたこと

1. **期間の上限は 31 日**（ユーザー決定 2026-11-14）。`end - start` が 30 日以下、つまり両端を含めて 31 日まで。`start > end` も 422。client が送る最大は過去の運用情報のフォームの 30 日で、ほかの画面は 1 日。
2. **検証する口は日付を受ける口すべて**（ユーザー決定）。目撃・運用・編成の期間、`calendar-dates`、`formations/as/of/:date`・`calendars/as/of/:date`、`searchTime`（時刻断面 4 口・`current-positions`・`:id/current-position`）、番号の並び（`operationNumbers`・`formationNumbers`・`operationIds`）。
3. **日付は `YYYY-MM-DD` だけ**を通す（`IsISO8601({ strict: true })` と `/^\d{4}-\d{2}-\d{2}$/`）。暦に無い日（2026-02-30）は通さない。client は `yyyy-MM-dd` しか送らない。編成の期間は今 `@IsISO8601()`（緩い）なので、この口だけ受け付ける形が狭くなる。
4. **`searchTime` は時差の付いた ISO 8601 だけ**を通す（`IsISO8601({ strict: true, strictSeparator: true })` と、Date にできること）。client が送るのは `…T12:00:00+09:00` と api が返した `…Z` の 2 つだけ。時差の無い値は Lambda の UTC で読まれて 9 時間ずれるので、通さない。
5. **番号の並びは 1〜200 件**。200 は既存の `SIGHTING_LIST_MAX_LIMIT`・`invalidate` の ids と同じ値。実データの最大は運用 105・編成 126。`operationIds` は各要素を UUID で検証する（今は DB の 22P02 で 400 になる。これからは 422）。
6. **`trip-blocks/bulk` は件数を置かず、要素ごとに検証する**（ユーザー決定）。`ParseArrayPipe({ items: CreateTripBlockDto, ...validationPipeOptions })`。失敗は 422。
7. **競合は編成番号ごとの advisory lock で並べる**。`SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`、鍵は `'operation-sighting-latest-cache:' + formationNumber`。トランザクションの終わりで自動で外れる。キャッシュ行がまだ無い場合も守れる（`SELECT … FOR UPDATE` は無い行を押さえられない）。lock を取った後に、キャッシュ・直前の目撃・目撃そのものの状態を `manager` で読み直して判断する。
8. **`restore` は有効な目撃なら `UseCaseError`（reason `already_valid`）で 422**。lock の中で読み直した状態で判定する。domain の素の `Error` は、lock の中の判定を通った後では起きない。`invalidate` も lock の中で読み直して `already_invalidated` を返す。`invalidateMany` の `skippableReason` に `already_valid` は足さない（restore には一括が無い）。
9. **`rebuild-latest-cache` は 1 つのトランザクションで作り直す**。`LOCK TABLE operation_sighting_latest_caches IN SHARE ROW EXCLUSIVE MODE` を取り、全行を消してから、編成ごとの最新の目撃で入れ直す。投稿のキャッシュ書き込みはこの間待つ。
10. **client の過去の運用情報は、URL の `days` を 30 に切る**（ユーザー決定。client の別の小さな PR）。今は URL を直に打つと 31 日以上を送れて、api の上限で 422 になる。
11. 検証の失敗は既存の作法どおり 422（`errorHttpStatusCode: 422`）。本文は Nest の既定（`message` は文字列の配列）。client の `FetchError` は配列の `message` を読める。

## Global Constraints

- 期間の上限 `PERIOD_MAX_DAYS = 31`（両端を含む日数）、番号の並びの上限 `NUMBER_LIST_MAX = 200`。どちらも `src/core/validators/limits.ts` に置き、ほかで数を直に書かない。
- 日付の形は `YYYY-MM-DD`、`searchTime` は時差の付いた ISO 8601。
- 検証の失敗は 422。500 を返す入力を新しく作らない。
- 今の client（`../sotetsu-lab-v3-client`）が送る値は、どれも今までどおり通る。
- 相対 import には `.js` を付ける。`as any`・`@ts-ignore` は使わない。query は `createQueryBuilder` で書く。
- テストは `npm run test -- <名前>`（サンドボックスの外）。
- コミットは Conventional Commits と絵文字。ドメイン名は日本語（目撃情報・運用・編成・ダイヤ）。

## Review Focus

1. 期間のちょうど 31 日（`2026-11-01`〜`2026-12-01`）は通り、32 日（〜`2026-12-02`）は 422。`start == end`（1 日）は通る。
2. 暦に無い日 `2026-02-30`・`20261114`・`2026-11-14T00:00:00+09:00` は 422（今は繰り上がって通るか 500）。
3. `searchTime` が `2026-11-14T12:00:00+09:00`・`2026-11-13T22:02:06.178Z` は通り、`2026-11-14T12:00:00`（時差なし）・`garbage` は 422。省略は今までどおり今の時刻。
4. キャッシュの無い編成に 2 件を同時に投稿すると、両方 201 になり、キャッシュは目撃時刻の新しい方を指す。
5. 有効な目撃に `restore` を 2 回当てると 2 回とも 422（`already_valid`）。無効な目撃に 2 人が同時に `restore` すると、1 人は 200、もう 1 人は 422。

---

### Task 1: 共通の検証と、日付・期間・時刻の Param クラス

**Files:**
- Create: `src/core/validators/limits.ts`・`src/core/validators/date-validators.ts`・`src/core/validators/date-validators.spec.ts`
- Create: `src/core/validators/comma-list.ts`（`parseCommaList` を Transform で使う形）・同 spec
- Modify: `src/libs/operation-sighting/usecase/params/operation-sighting-list.param.ts`（`IsParsableDate` を core から import する）

**Interfaces:**
- Produces:
  - `PERIOD_MAX_DAYS = 31`・`NUMBER_LIST_MAX = 200`
  - `IsDateOnly(): PropertyDecorator` — `YYYY-MM-DD` で暦にある日
  - `IsInstant(): PropertyDecorator` — 時差の付いた ISO 8601 で Date にできる
  - `IsParsableDate(): PropertyDecorator` — 既存のものを移す
  - `IsPeriodWithin(startProperty: string, maxDays: number): PropertyDecorator` — 付けた項目（end）が `startProperty` 以上で、両端を含めて `maxDays` 日以内。どちらかが `IsDateOnly` でないときは何も言わない（そちらの検証に任せる）
  - `CommaList(): PropertyDecorator` — `@Transform` で `parseCommaList` を当て、`string[]` にする（未指定は undefined のまま）

- [ ] **Step 1: テストを書く**（`class-validator` の `validate` と `class-transformer` の `plainToInstance` で、小さな試験用クラスに付けて確かめる）

```ts
it.each(['2026-11-14', '2026-02-28', '2028-02-29'])('IsDateOnly は %s を通す', ...);
it.each(['2026-02-30', '20261114', '2026-11-14T00:00:00+09:00', 'garbage', ''])('IsDateOnly は %s を通さない', ...);
it.each(['2026-11-14T12:00:00+09:00', '2026-11-13T22:02:06.178Z'])('IsInstant は %s を通す', ...);
it.each(['2026-11-14T12:00:00', '2026-11-14', 'garbage', '2026-W01'])('IsInstant は %s を通さない', ...);
it('IsPeriodWithin(31) は 11/01〜12/01 を通し 11/01〜12/02 と 11/02〜11/01 を通さない', ...);
it('IsPeriodWithin は start == end を通す', ...);
it('CommaList は "11, 31G,,11" を ["11","31G"] にする', ...);
```

- [ ] **Step 2: `npm run test -- date-validators comma-list` で失敗を見る**
- [ ] **Step 3: 上の Interfaces を書く**。`IsPeriodWithin` は `ValidateBy` で、`args.object[startProperty]` と比べる。日数は `dayjs(end).diff(dayjs(start), 'day') + 1`（どちらも `YYYY-MM-DD` なので時刻帯の影響は無い）
- [ ] **Step 4: 同じコマンドで通ることを見る**。`npm run test -- operation-sighting-list` も通ること
- [ ] **Step 5: コミット** `refactor: :recycle: 日付・期間・時刻の検証を core にまとめる`

### Task 2: 目撃・運用・編成・ダイヤの口に Param クラスを付ける

**Files:**
- Create（各ドメインの `usecase/params/`）:
  - `period.param.ts` を目撃・運用に（`start`・`end`。`end` に `IsPeriodWithin('start', PERIOD_MAX_DAYS)`）。編成は既存の `formation-find-many-by-specific-period.param.ts`（`startDate`・`endDate`）を `IsDateOnly` と `IsPeriodWithin('startDate', …)` に替える
  - `date.param.ts`（`date` に `IsDateOnly`）を編成・ダイヤの `as/of/:date` に
  - 時刻断面のまとめ取り 2 口の Query クラス（`searchTime?` に `IsInstant`、`operationNumbers`／`formationNumbers` に `CommaList`・`ArrayNotEmpty`・`ArrayMaxSize(NUMBER_LIST_MAX)`）、単体 2 口の `searchTime?`
  - 運用の `current-positions`（`operationIds` に `CommaList`・`ArrayNotEmpty`・`ArrayMaxSize`・`IsUUID('all', { each: true })`、`searchTime?`）と `:id/current-position`（`searchTime?`）
  - `calendar-dates` は未使用の `CalendarDateFindManyParam` を使い、`from?`・`to?` を `IsDateOnly` にする
- Modify: 上の口の controller（`operation-sighting.v3.controller.ts:46-164`・`operation.v3.controller.ts:110-184`・`formation.v3.controller.ts:16-47`・`calendar.v3.controller.ts:33-47`・`calendar-date.v3.controller.ts:32-50`）。`@Param('x') x: string` を `@Param() param: …Param`、`@Query('x')` を `@Query() query: …Query` にする。`include`・`fields`・`includeInvalidated`・`includeCarriedOver` など今ある query は、Query クラスに持たせるか今の受け方を残す（どちらでも、今の値が今までどおり届くこと）
- Test: 各 controller の spec に、Nest の `ValidationPipe(validationPipeOptions)` を通した e2e 風のテスト（`@nestjs/testing` と supertest。既存の controller spec の作法に合わせる）

- [ ] **Step 1: テストを書く**（目撃の口で代表を、ほかの口は 1 件ずつ）:
  - `GET /v3/operation-sightings/from/2026-11-01/to/2026-12-01` は service を呼ぶ。`…/to/2026-12-02` は 422 で service を呼ばない
  - `…/from/garbage/to/2026-11-14` と `…/from/2026-02-30/to/2026-03-01` は 422
  - `…/time-cross-section/operation-numbers?operationNumbers=11,31G` は service に `['11','31G']` を渡す。201 件は 422、空（`operationNumbers=`）は 422
  - `…?searchTime=2026-11-14T12:00:00%2B09:00` は通り、`searchTime=2026-11-14T12:00:00` は 422
  - `GET /v3/operations/current-positions?operationIds=<UUID>,not-a-uuid` は 422
  - `GET /v3/formations/as/of/2026-11-14` は通り、`/as/of/2026-02-30` は 422
- [ ] **Step 2: `npm run test -- controller` で失敗を見る**
- [ ] **Step 3: 上の Files のとおり付け替える**。service の引数の形は変えない（controller で Param から取り出して今の service に渡す）
- [ ] **Step 4: `npm run test` で全体が通ることを見る**
- [ ] **Step 5: コミット** `fix: :bug: 日付・期間・時刻・番号の並びを検証し、期間を 31 日・並びを 200 件までにする`

### Task 3: trip-blocks/bulk の配列を検証する

**Files:**
- Modify: `src/libs/trip-block/presentation/trip-block.v3.controller.ts:68-76`
- Test: `src/libs/trip-block/presentation/trip-block.v3.controller.spec.ts`（無ければ作る）

- [ ] **Step 1: テストを書く**: `POST /v3/trip-blocks/bulk` に、正しい要素 1 つは service に `CreateTripBlockDto` のインスタンスの配列を渡す。`trips` の無い要素・`trips[0].serviceId` が UUID でない要素・配列でない body（`{}`）は 422 で service を呼ばない。要素の中の知らない項目は落ちる（whitelist）
- [ ] **Step 2: 失敗を見る**
- [ ] **Step 3: `@Body(new ParseArrayPipe({ items: CreateTripBlockDto, ...validationPipeOptions }))` にする**（`validationPipeOptions` は `src/core/configs/validator-options.ts`）
- [ ] **Step 4: `npm run test` で通ることを見る**
- [ ] **Step 5: コミット** `fix: :bug: ダイヤのまとめ保存で配列の中身を検証する`

### Task 4: 最新キャッシュを触る書き込みを編成ごとの lock で並べる

**Files:**
- Create: `src/libs/operation-sighting/infrastructure/command/formation-cache-lock.ts` — `lockFormationCache(manager: EntityManager, formationNumber: string): Promise<void>`（決めたこと 7 の SQL）
- Modify: `src/libs/operation-sighting/infrastructure/queries/operation-sighting-latest-cache.query.ts` の `findOneByFormationNumber`、`operation-sighting.query.ts` の `findOneById`・`findOneLatestByFormationNumberAndBeforeSightingTime` に、省略できる `manager?: EntityManager` を足す（あれば `manager.getRepository(Model).createQueryBuilder`、無ければ今の repository）
- Modify: `src/libs/operation-sighting/usecase/operation-sighting.v3.service.ts` の `post`（:889-935）・`#invalidateOne`（:1031-1125）・`restore`（:1137-1202）
- Test: `operation-sighting.v3.service.spec.ts`

**Interfaces:**
- Produces: `lockFormationCache`、各 query の `manager?` 引数、`UseCaseError` の reason `already_valid`

- [ ] **Step 1: テストを書く**（今の service spec のモックの作法で）:
  - `post` は、`dataSource.transaction` の中で `lockFormationCache` を呼んだ後に、同じ `manager` で `findOneByFormationNumber` を呼ぶ（呼び出しの順と `manager` を確かめる）。トランザクションの外ではキャッシュを読まない
  - `#invalidateOne`（`invalidate` から）と `restore` も同じ順で、lock の後に `findOneById(…, manager)` で目撃を読み直す
  - `restore` は、読み直した目撃が有効なら `UseCaseError`（`context.reason === 'already_valid'`）を投げ、保存しない
  - `invalidate` は、lock の後に読み直した目撃が無効になっていたら `already_invalidated` を投げる（最初の読みでは有効だった場合）
  - キャッシュの判断（upsert・rollback・delete・none）は今の spec の期待どおり（判断の中身は変えない）
- [ ] **Step 2: `npm run test -- operation-sighting.v3.service` で失敗を見る**
- [ ] **Step 3: 3 つの書き込みを「トランザクション → lock → 読み直し → 判断 → 保存」の順に組み替える**。最初の `findOneById`（存在と編成番号を知るため）はトランザクションの外に残してよい。キャッシュの判断は `decideCacheActionForPost`・`…ForInvalidation`・`…ForRestore` の private メソッドに切り出し、トランザクションの中から呼ぶ。`#applyCacheAction` は変えない
- [ ] **Step 4: `npm run test` で全体が通ることを見る**
- [ ] **Step 5: コミット** `fix: :bug: 目撃情報の投稿・無効化・復元を編成ごとに並べ、最新キャッシュの競合をなくす`

### Task 5: rebuild-latest-cache を表が空でなくても動くようにする

**Files:**
- Modify: `src/libs/operation-sighting/usecase/operation-sighting.cli.service.ts`
- Modify: `operation-sighting.query.ts` の `findManyLatestPerFormation` に `manager?` を足す。`operation-sighting-latest-cache.command.ts` に `removeAll(manager)` が無ければ足す
- Test: `operation-sighting.cli.service.spec.ts`（無ければ作る）

- [ ] **Step 1: テストを書く**: `rebuildLatestCache` は 1 つのトランザクションの中で、`LOCK TABLE operation_sighting_latest_caches IN SHARE ROW EXCLUSIVE MODE` → 全行の削除 → `findManyLatestPerFormation(manager)` → `bulkSave(caches, manager)` の順に呼ぶ。作る cache に id を渡さない（削除の後なので新しい id でよい）
- [ ] **Step 2: 失敗を見る**
- [ ] **Step 3: 書く**
- [ ] **Step 4: `npm run test` で通ることを見る**
- [ ] **Step 5: 手元の Supabase（`npm run db:copy-from-prod` 済み）で `npm run cli -- operation-sighting rebuild-latest-cache` を 2 回続けて流し、2 回とも成功し、件数が同じことを見る**（サンドボックスの外）
- [ ] **Step 6: コミット** `fix: :bug: 最新キャッシュの作り直しを表が空でなくても流せるようにする`

### Task 6: 手元で通しで確かめる（controller が行う）

- [ ] **Step 1: 手元の api を立て、試験アカウント `dev-reporter` のトークンで、キャッシュの無い編成（手元 DB で `operation_sighting_latest_caches` に無い編成番号を選ぶ）に、目撃時刻の違う 2 件を `Promise.all` で同時に投稿する**。両方 201、キャッシュは新しい方を指すこと。同じことを今の master のビルドで流すと片方が 500 になるかも見る（再現しなければ、そう書く）
- [ ] **Step 2: Review Focus の 1〜3 の値を curl で投げ、422 と 200 を確かめる**。今の client（手元の `ng serve`）で、過去の運用情報（30 日）・駅別時刻表・リアルタイム運用情報・編成別時刻表・列車位置情報を開き、api に 422 が出ないことを見る

### Task 7: client の過去の運用情報で URL の days を 30 に切る（client の別 PR）

**Files:**
- Modify: `../sotetsu-lab-v3-client/src/app/pages/operation/operation-past-time/operation-past-time.component.ts:94-99`（`+days` を `0〜30` に収める。上限は検索フォームの `Validators.max` と同じ定数を使う）
- Test: 同じ component の spec

- [ ] **Step 1: テストを書く**: URL の `days=45` は 30 日分の日付で検索する。`days=-3` は既定の扱い（フォームの最小値）になる
- [ ] **Step 2〜4: 失敗を見る → 直す → client の `npx jest` と `npx ng lint` が通る**
- [ ] **Step 5: client の作業ブランチ（master から・`first commit`）でコミット** `fix: :bug: 過去の運用情報で URL の日数を 30 日までにする`
