# 画面の CDN キャッシュの失効（SSR リリース 3） Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 列車情報・臨時ダイヤの日付・過去の日の目撃を書き込んだら、その画面の CloudFront キャッシュを、タグを使って API が捨てる。

**Architecture:** `src/core/modules/cdn-invalidation/` に Nest モジュール `CdnInvalidationModule` を作り、`CdnInvalidation.invalidate({ tags })` を出す。中では `@aws-sdk/client-cloudfront` の `CreateInvalidation` を、1 回だけ・短い打ち切りで呼ぶ。失敗はログに残すだけにする。書き込みの usecase（trip-block・calendar-date・operation-sighting）が、捨てるタグを決めて、`socketSignal.send` の隣で呼ぶ。配信 ID は、`serverless.ts` が client のスタックの出力から環境変数に入れる。

**Tech Stack:** NestJS 12（ESM）、TypeORM 1.x（createQueryBuilder）、Vitest＋SWC、`@aws-sdk/client-cloudfront`、osls 3.78。

**Spec:** `docs/superpowers/specs/2026-10-27-cdn-invalidation-design.md`（親は client の `docs/superpowers/specs/2026-10-12-ssr-design.md` の 6.2 章）

## Global Constraints

- タグの形は client と同じにする。
  - `calendar:<calendarId>` は全体を小文字にする。
  - `sighting-date:<YYYY-MM-DD>` の日付は、4 時区切りの運行日（`getBaseDate`）にする。
  - 失効のパスでは、頭に `#` を付ける。
- 失効は書き込みのたびに 1 回呼び、まとめない（spec 3 章の 1）。
- 失効の失敗では、書き込みを失敗にしない。
  - 再試行はしない（`maxAttempts: 1`）。
  - 接続は 300ms、応答は 1 秒で打ち切る（`throwOnRequestTimeout: true`）。
  - ログは `Logger.warn` だけにする。
- `CDN_DISTRIBUTION_ID` が空なら、SDK を呼ばずに何もしない。
- CloudFront の client の region は `us-east-1` に固定する。
- 新しい部品の名前に `Service` を付けない。引数はオブジェクトで渡す（memory：core の新部品）。
- DB を読むときは `createQueryBuilder` だけを使う。`find`・`findOne`・`getMany` 系の repository の近道は書かない。
- 今日以降（4 時区切り）の目撃では、失効を呼ばない。
- 手元で `osls package` や `serverless package` を打たない。S3 のレイヤーの package.json を上書きしてしまう。
- テストは `npx vitest run <パス>` で回す。サンドボックスの外で回す（SWC のネイティブキャッシュの問題）。
- コミットは Conventional Commits＋絵文字にし、本文は日本語で書く。署名つきで、サンドボックスの外でコミットする。パイプでコマンドをつながない。

## Review Focus

1. **CloudFront が遅い・落ちているときの書き込み。** 失効が詰まっても、書き込みの応答は 3 秒の timeout 内に成功で返るべきだ。→ Task 1 で、打ち切りの設定値と、例外を握りつぶすことを spec で固定する。
2. **列車の calendarId が null の書き込み。** `CreateTripDto.calendarId` は null になりうる。そのときは、`calendar:null` のような偽のタグを送らず、そのタグだけを外す。→ Task 2 の spec で押さえる。
3. **列車を別のダイヤに付け替える置き換え（PUT）。** 書き換え前のダイヤの画面も捨てる。→ Task 2 で、前と後の両方のタグを確かめる。
4. **深夜 0〜4 時の目撃。** 3:30 の目撃は前日の運行日のものだ。今が 3:30 なら「今日」の扱いなので、捨てない。今が 4:30 なら前日の扱いなので、捨てる。→ Task 4 で、時刻を固定して確かめる。
5. **目撃の取り消しと戻し。** 過ぎた日の目撃を取り消したら、その日の画面を捨てる。→ Task 4 で確かめる。

---

## ファイルの地図

- 作る:
  - `src/core/modules/cdn-invalidation/cdn-invalidation.ts`（＋`.spec.ts`）
  - `cdn-invalidation.module.ts`
  - `cache-tags.ts`（＋`.spec.ts`）
- 変える:
  - `package.json`
  - `src/libs/trip-block/usecase/trip-block.v3.service.ts`（＋spec）と `trip-block.v3.module.ts`
  - `src/libs/calendar/usecase/calendar-date.v3.service.ts`（＋spec）、`infrastructure/command/calendar-date.command.ts`、calendar の module
  - `src/libs/operation-sighting/usecase/operation-sighting.v3.service.ts`（＋spec）と module
  - `serverless.ts`
  - `docs/adr/0012-cdn-invalidation.md`（新規）
  - `CLAUDE.md`（失効の 1 段落）

---

### Task 1: `CdnInvalidation` の部品

**Files:**
- Create: `src/core/modules/cdn-invalidation/cache-tags.ts`、`cache-tags.spec.ts`、`cdn-invalidation.ts`、`cdn-invalidation.spec.ts`、`cdn-invalidation.module.ts`
- Modify: `package.json`（`@aws-sdk/client-cloudfront` を `@aws-sdk/client-lambda` と同じ系の版で入れる）

**Interfaces:**
- Produces:
  - `calendarCacheTag(calendarId: string): string` は `calendar:<id>` を小文字で返す。
  - `sightingDateCacheTag(date: string): string` は `sighting-date:<date>` を返す。
  - `calendarCacheTags(calendarIds: readonly (string | null | undefined)[]): string[]` は、null・空を外し、重複を除いたタグを返す。
  - `pastSightingDateCacheTags(params: { sightingTimes: readonly (Date | string)[]; now: dayjs.Dayjs }): string[]` は、運行日が今日より前のものだけを、重複を除いて返す。
  - `@Injectable() class CdnInvalidation` は `invalidate(params: { tags: readonly string[] }): Promise<void>` を持つ。
  - `CdnInvalidationModule` は `CdnInvalidation` を providers と exports に入れる。
  - `CDN_INVALIDATION_CLIENT_CONFIG` は `{ region: 'us-east-1', maxAttempts: 1, requestHandler: { connectionTimeout: 300, requestTimeout: 1000, throwOnRequestTimeout: true } }` で、export する。

- [ ] **Step 1: `cache-tags.spec.ts` を書く**
  - `calendarCacheTag('ABC-def')` は `'calendar:abc-def'`。
  - `calendarCacheTags(['a', null, 'a', '', 'B'])` は `['calendar:a', 'calendar:b']`。
  - `pastSightingDateCacheTags`:
    - `now = 2026-10-27 04:30 JST` のとき:
      - `2026-10-27T03:30+09:00` は `['sighting-date:2026-10-26']`。
      - `2026-10-27T05:00+09:00` は `[]`。
    - `now = 2026-10-27 03:30 JST` のとき、`2026-10-27T03:00+09:00` は `[]`（運行日は 10-26 で、今日も 10-26 だから）。
    - 同じ日を 2 つ渡すと、タグは 1 つになる。
- [ ] **Step 2: `cdn-invalidation.spec.ts` を書く**
  - SDK の client は、コンストラクタに `{ send }` のモックを渡して差し替える。`socket-signal.spec.ts` と同じやり方だ。
  - `CDN_DISTRIBUTION_ID` が空なら、`send` を呼ばない。
  - タグが 0 個なら、`send` を呼ばない。
  - `invalidate({ tags: ['calendar:a', 'calendar:a', 'sighting-date:2026-10-01'] })` では、`CreateInvalidationCommand` の input が次のとおりであること。
    - `DistributionId` が環境変数の値。
    - `InvalidationBatch.Paths` が `{ Quantity: 2, Items: ['#calendar:a', '#sighting-date:2026-10-01'] }`。
    - `CallerReference` が空でない文字列。
  - `send` が reject しても、`invalidate` は resolve し、`Logger.warn` が 1 回呼ばれる。
  - `CDN_INVALIDATION_CLIENT_CONFIG` が上の値と同じであること。
- [ ] **Step 3: `npx vitest run src/core/modules/cdn-invalidation` を回し、FAIL を見る**（モジュールが無い）
- [ ] **Step 4: 実装する**
  - `npm install @aws-sdk/client-cloudfront`（サンドボックスの外）。
  - `cdn-invalidation.ts` は `socket-signal.ts` の形をまねる。
    - コンストラクタは `@Optional() client?: CloudFrontClient` を受ける。
    - 環境変数は、呼ぶたびに `process.env` から読む。
    - `CallerReference` は `` `${Date.now()}-${tags.join(',')}` `` を 128 文字に切ったもの。
  - `pastSightingDateCacheTags` は `getBaseDate`（`core/utils/datetime.ts`）で比べる。
  - コメントは日本語で、`socket-signal.ts` と同じ密度にする。
- [ ] **Step 5: Step 3 のコマンドで PASS を見る**
- [ ] **Step 6: コミットする**: `feat: :sparkles: 画面の CDN キャッシュをタグで捨てる部品を足す`

### Task 2: 列車情報の書き込みで捨てる

**Files:**
- Modify: `src/libs/trip-block/usecase/trip-block.v3.service.ts`、`trip-block.v3.service.spec.ts`、`src/libs/trip-block/trip-block.v3.module.ts`

**Interfaces:**
- Consumes: Task 1 の `CdnInvalidation.invalidate` と `calendarCacheTags`。

- [ ] **Step 1: spec を書く**
  - 今ある `TestingModule` の全部に `{ provide: CdnInvalidation, useValue: { invalidate: mockInvalidate } }` を足す。足さないと既存の spec が落ちる。
  - 次の `it` を足す。
    - `createManyTripBlocks` は、dto の全列車の calendarId から作ったタグ（null を除き、重複を除いたもの）で `invalidate` を 1 回呼ぶ。
    - `replaceOneTripBlock` は、書き換え前の block の列車の calendarId と、dto の calendarId の両方を合わせたタグで呼ぶ。
      - 前が `cal-old`、後が `cal-new` なら、`['calendar:cal-new', 'calendar:cal-old']` の 2 つを含む（順は問わない）。
    - `addTripToTripBlock` と `deleteTripFromTripBlock` は、関係する block（from・to、または対象の block）の列車の calendarId のタグで呼ぶ。
    - 列車の calendarId がすべて null なら、`invalidate` を `tags: []` で呼んでよい（部品側が何もしない）。
    - `invalidate` が reject しても、書き込みの結果が返る。部品は reject しないが、その約束を spec で固定する。
- [ ] **Step 2: `npx vitest run src/libs/trip-block` を回し、新しい `it` だけが FAIL になることを見る**
- [ ] **Step 3: 実装する**
  - constructor で `CdnInvalidation` を受け、module の imports に `CdnInvalidationModule` を足す。
  - `replaceOneTripBlock` では、今の `current` を `hasNextLink` のときにしか読んでいない。これを、失効のために常に読むよう変える。
    - 1 回の読みは `findOneTripBlockByTripBlockId(id)` のまま使い、検証にも同じ値を渡す。
  - 各メソッドでは、`socketSignal.send` の直前に `await this.cdnInvalidation.invalidate({ tags })` を置く。
- [ ] **Step 4: `npx vitest run src/libs/trip-block` で PASS を見る**
- [ ] **Step 5: コミットする**: `feat: :sparkles: 列車情報を書いたら、そのダイヤの画面のキャッシュを捨てる`

### Task 3: 臨時ダイヤの日付の書き込みで捨てる

**Files:**
- Modify: `src/libs/calendar/usecase/calendar-date.v3.service.ts`、`calendar-date.v3.service.spec.ts`、`src/libs/calendar/infrastructure/command/calendar-date.command.ts`、calendar の module（`CalendarDateV3Service` を providers に持つもの）

**Interfaces:**
- Changes: `CalendarDateCommand.deleteOneById(params: { id: string }): Promise<{ calendarId: string }>`
  - 消した行の calendarId を返す。見つからなければ、今までどおり `UseCaseError` を投げる。

- [ ] **Step 1: spec を書く**
  - `create` は、作った行の `calendarId` のタグで `invalidate` を呼ぶ。
  - `deleteOneById` は、command が返した `calendarId` のタグで呼ぶ。
  - command が投げたら、`invalidate` を呼ばない。
- [ ] **Step 2: `npx vitest run src/libs/calendar` で FAIL を見る**
- [ ] **Step 3: 実装する**
  - command の削除を `createQueryBuilder().delete().from(CalendarDateModel).where('id = :id', { id }).returning(...)` にする。
  - 返った行が 0 なら、今のエラーを投げる。
  - `returning` の列名は、モデルの列名（DB の snake_case）に合わせる。
  - `create` は今 `return this.calendarDateCommand.create(params)` だけなので、`async` にして、結果を受けてから失効を呼ぶ。
- [ ] **Step 4: `npx vitest run src/libs/calendar` で PASS を見る**
- [ ] **Step 5: コミットする**: `feat: :sparkles: 臨時ダイヤの日付を書いたら、そのダイヤの画面のキャッシュを捨てる`

### Task 4: 過去の日の目撃の書き込みで捨てる

**Files:**
- Modify: `src/libs/operation-sighting/usecase/operation-sighting.v3.service.ts`、`operation-sighting.v3.service.spec.ts`、`src/libs/operation-sighting/operation-sighting.v3.module.ts`

**Interfaces:**
- Consumes: Task 1 の `pastSightingDateCacheTags`。`now` は `dayjs()` で渡す。

- [ ] **Step 1: spec を書く**
  - 今ある `TestingModule` の全部に `CdnInvalidation` のモックを足す。
  - `vi.useFakeTimers()` と `vi.setSystemTime` で、今を `2026-10-27T04:30:00+09:00` に固定する。
  - `post` の `sightingTime` が `2026-10-26T12:00:00+09:00` なら、`['sighting-date:2026-10-26']` で `invalidate` を呼ぶ。
  - `post` の `sightingTime` が `2026-10-27T05:00:00+09:00`（今日）なら、`invalidate` を呼ばない。
  - `invalidate`・`restore` では、読んだ目撃の `sightingTime` が前日なら、その日のタグで呼ぶ。
- [ ] **Step 2: `npx vitest run src/libs/operation-sighting` で FAIL を見る**
- [ ] **Step 3: 実装する**
  - `post` では、`sightingTimeInstance` から、`invalidate`・`restore` では `dto.sightingTime` から、タグを作る。
  - タグが空なら、`invalidate` を呼ばない（呼んでも部品は何もしないが、spec の「呼ばない」に合わせる）。
  - 呼ぶ位置は `socketSignal.send` の直前にする。
- [ ] **Step 4: `npx vitest run src/libs/operation-sighting` で PASS を見る**
- [ ] **Step 5: コミットする**: `feat: :sparkles: 過ぎた日の目撃を書いたら、その日の過去の運用情報のキャッシュを捨てる`

### Task 5: 配信 ID と IAM、文書

**Files:**
- Modify: `serverless.ts`、`CLAUDE.md`
- Create: `docs/adr/0012-cdn-invalidation.md`

- [ ] **Step 1: 実装する**
  - `provider.environment` に `CDN_DISTRIBUTION_ID: '${cf:sotetsu-lab-v3-${sls:stage}-client-cfstack.WebDistributionId}'` を足す。
  - `provider.iam.role.statements` に、`Effect: Allow`・`Action: ['cloudfront:CreateInvalidation']`・`Resource: ['arn:aws:cloudfront::${aws:accountId}:distribution/${cf:…WebDistributionId}']` を足す。
    - 文字列の中の `${…}` は、今の `socket-broadcast` の行と同じく、エスケープの書き方をそろえる。
  - ADR-0012 に書くこと:
    - 書き込みのたびに失効し、まとめないこと（量の根拠を添える）。
    - 失敗しても書き込みを成功にすること。
    - タグの形が client と対であること。
    - 2c より先に出すこと。
  - `CLAUDE.md` に 1 段落足す。書き込みの usecase は、`socketSignal.send` の隣で `cdnInvalidation.invalidate` を呼ぶ。新しい書き込みの入口を足したら、捨てるタグも決める。
- [ ] **Step 2: 確かめる**
  - `node -e` で `serverless.ts` を import し、`provider.environment.CDN_DISTRIBUTION_ID` と IAM の statement を JSON で出力して、目で見る。Node 24 は型を外して読める。読めなければ、その旨を報告する。
  - `npm run build`、`npx vitest run`（全件）、`npm run lint` を回す。どれもサンドボックスの外で回す。
- [ ] **Step 3: コミットする**
  - コードと文書は分ける。
    - `build: :wrench: CDN の失効の権限と配信 ID を Lambda に渡す`
    - `docs: :memo: CDN の失効の ADR と説明を足す`

### Task 6: 出して確かめる（コントローラーとユーザー）

- [ ] **Step 1:** PR を作る（ユーザーの「pr」で）。マイルストーンは M2（SSR）にする。版は minor。
- [ ] **Step 2:** マージとタグの push はユーザーがやる。デプロイが通ったことを確かめる。
- [ ] **Step 3: 本番で 1 回確かめる**
  - 保存テスト用の渋谷工事臨時ダイヤ（memory）で、列車情報を 1 回更新してもらう。
  - `aws cloudfront list-invalidations` で、`#calendar:<id>` が載ることを見る。これはユーザーの `!` で流す。
  - CloudWatch のログに `CDN` の警告が無いことを見る。
  - 2c より前なので、タグが受け付けられずに警告が出た場合は、spec 5 章のとおり記録して、2c のあとに確かめ直す。
- [ ] **Step 4:** memory と、client の 2c の計画の Task 7 Step 0 の前提に、結果を書く。
