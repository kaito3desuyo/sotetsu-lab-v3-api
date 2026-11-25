# 共有の読み取りキャッシュ（DynamoDB） Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** trip-blocks の一覧と運用の区間の結果を DynamoDB に置き、Lambda の実体をまたいで使い回して、Supabase の Egress を減らす。

**Architecture:** `src/core/modules/shared-cache/` に、どのデータにも使える `SharedCache`（`getOrLoad`・`invalidate`・`invalidateNamespace`）を置く。捨てる仕組みは「タグと名前空間の版」で、値の項目と版の項目を 1 回の `BatchGetItem` で取って突き合わせる。テーブル名の環境変数が空なら素通しになる。

**Tech Stack:** NestJS 12 / TypeScript 6（ESM・strict）/ `@aws-sdk/client-dynamodb` / Node `zlib` / Vitest + unplugin-swc / Serverless Framework

**Spec:** `docs/superpowers/specs/2026-11-25-shared-cache-design.md`

## Global Constraints

- テーブル名は `${param:prefix}-shared-cache-table`（本番 `sotetsu-lab-v3-prod-api-shared-cache-table`）。パーティションキーは `pk`（S）だけ。オンデマンド。TTL の属性は `expiresAt`（秒の UNIX 時刻）
- 項目の `pk`：値 `entry#<namespace>#<key のハッシュ>`、タグ `tag#<タグ>`、名前空間 `ns#<namespace>`
- 環境変数 `SHARED_CACHE_TABLE_NAME` が空なら、`getOrLoad` は `load()` を呼んで返すだけ、`invalidate` は何もしない
- DynamoDB のクライアント：`region` は指定しない（Lambda の `AWS_REGION` を使う）・`maxAttempts: 1`・`connectionTimeout: 300`・`requestTimeout: 1000`・`throwOnRequestTimeout: true`（`CDN_INVALIDATION_CLIENT_CONFIG` と同じ考え）
- 圧縮後 380KB（`380 * 1024` バイト）を超える値は置かない
- 期限は 24 時間（`86_400` 秒）
- タグの名前は CDN の失効のタグと同じ（`calendarCacheTags(calendarIds)`・`src/core/modules/cdn-invalidation/cache-tags.ts`）
- `getOrLoad`・`invalidate`・`invalidateNamespace` は DynamoDB の失敗で reject しない（warn のログ）。`load()` の失敗はそのまま reject する
- 相対 import は `.js` 付き。`as any`・`@ts-ignore` は使わない。lodash は使わない
- テストは SWC を使うのでサンドボックスの外で流す
- コミットは Conventional Commits＋絵文字、ドメイン名は日本語。メッセージは `.context/commit-msg.txt` に書いて `git commit -F`。末尾は `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` と `Claude-Session: https://claude.ai/code/session_01NxksuqCpWLTXCFvmXt2nKt`（モデル名を書き換えない）。一時ファイルは `.context/`（`$TMPDIR` は使わない）

## Review Focus

- タグを捨てるのと `load()` が重なる：版は `load()` の前に読み、その版で置く。`load()` の最中に `invalidate` された値は次の読みで外れになる（Task 1 のテスト「load の最中に捨てられた値は次に外れる」）
- 同じ `include`・`fields` でも並びが違う（`fields[time]=a,b` と `b,a`、キーの順）：同じキーになる（Task 2 のテスト）
- 期限を過ぎたが TTL でまだ消えていない値：外れとして取り直す（Task 1）
- DynamoDB が遅い・落ちている：応答は DB の結果で返り、書き込みも成功のまま（Task 1・Task 2）
- 版の項目がまだ無い（初めての取得、捨てたことのないタグ）：0 とみなして当たりにできる（Task 1）

---

### Task 1: `SharedCache` の部品

**Files:**
- Create: `src/core/modules/shared-cache/shared-cache.ts`
- Create: `src/core/modules/shared-cache/shared-cache.module.ts`
- Create: `src/core/modules/shared-cache/shared-cache.spec.ts`
- Modify: `package.json`（`@aws-sdk/client-dynamodb` を、`@aws-sdk/client-cloudfront` と同じ `^3.1157.0` 系で dependencies に足す。`npm install`）

**Interfaces:**
- Produces:
  ```ts
  export const SHARED_CACHE_CLIENT_CONFIG: DynamoDBClientConfig;
  export const SHARED_CACHE_MAX_BODY_BYTES = 380 * 1024;
  export const SHARED_CACHE_DEFAULT_TTL_SECONDS = 86_400;
  @Injectable() export class SharedCache {
      constructor(@Optional() client?: DynamoDBClient);
      getOrLoad<T>(params: {
          namespace: string;
          key: readonly (string | number)[];
          tags: readonly string[];
          ttlSeconds?: number;      // 既定 SHARED_CACHE_DEFAULT_TTL_SECONDS
          bypass?: boolean;         // true なら読まずに load して置き直す
          load: () => Promise<T>;
      }): Promise<T>;
      invalidate(params: { tags: readonly string[] }): Promise<void>;
      invalidateNamespace(params: { namespace: string }): Promise<void>;
  }
  @Module({ providers: [SharedCache], exports: [SharedCache] }) export class SharedCacheModule {}
  ```

- [ ] **Step 1: 失敗するテストを書く**

`DynamoDBClient` の代わりに、`send(command)` を受けてコマンドの型（`BatchGetItemCommand`・`PutItemCommand`・`UpdateItemCommand`）ごとに中の Map を読み書きする偽物を渡す（`cdn-invalidation.spec.ts` の差し替え方にそろえる）。`process.env.SHARED_CACHE_TABLE_NAME` は `beforeEach` で `'t'` にし、`afterEach` で戻す。時刻は `vi.useFakeTimers()`・`vi.setSystemTime`。

テスト（describe `SharedCache`）：
- `テーブル名が無ければ毎回 load を呼び、DynamoDB に触らない`：env を空にして 2 回 `getOrLoad` → `load` 2 回、`send` 0 回
- `外れたら load の結果を置き、次は load を呼ばずに同じ値を返す`：2 回目の戻り値が `toEqual` で同じ、`load` 1 回
- `返す値は置いた値の写しで、書き換えても次の読みに影響しない`：1 回目の戻りを書き換えても 2 回目は元の値
- `key が違えば別の値`・`namespace が違えば別の値`
- `タグを捨てたら外れる`：`invalidate({ tags: ['calendar:a'] })` の後は `load` がまた呼ばれる。タグ `calendar:b` を捨てても `calendar:a` の値は当たる
- `名前空間を捨てたら、その名前空間の値だけ外れる`
- `版の項目が無くても当たる`（一度も捨てていないタグ）
- `load の最中に捨てられた値は次に外れる`：`load` の中で `invalidate` を呼び、その値は返るが、次の `getOrLoad` で `load` がまた呼ばれる
- `期限を過ぎた値は外れる`：`ttlSeconds: 60` で置き、61 秒進めて取り直し
- `bypass なら読まずに load し、置き直す`：置いた後に `bypass: true` で呼ぶと `load` が呼ばれ、その新しい値が次の（bypass なしの）読みで返る
- `圧縮後に上限を超える値は置かず、load の結果を返す`：乱数の文字列で 400KB を超える値。`PutItemCommand` が送られない
- `読む失敗では load の結果を返す`・`置く失敗でも値を返す`：偽物の `send` が reject。どちらも reject しない
- `invalidate は失敗しても reject しない`・`タグが空なら何も送らない`
- `load が失敗したら reject し、何も置かない`
- `置く項目の形`：`PutItemCommand` の `Item` に `pk`（`entry#trip-blocks#` で始まる）・`namespace`・`keyParts`・`body`（Binary）・`tagVersions`・`expiresAt`（秒）がある

- [ ] **Step 2: 失敗を確かめる**

Run: `npx vitest run src/core/modules/shared-cache`（サンドボックスの外）
Expected: FAIL（`shared-cache.js` が無い）

- [ ] **Step 3: `SharedCache` を書く**

- キーのハッシュ：`JSON.stringify(key)` の sha256（`node:crypto`）の 16 進
- 本体：`JSON.stringify(value)` を `zlib.gzipSync`、読むときは `gunzipSync` して `JSON.parse`（返す値はいつも JSON から作り直したもの。外れたときも、置いた写しと同じ形にするため `load()` の結果を一度 JSON に通して返す）
- `tagVersions` は `{ "tag#calendar:a": 3, "ns#trip-blocks": 1 }` の形の Map 属性。読んだ版と比べ、無い版は 0
- 読みは `BatchGetItemCommand`（値＋タグ＋名前空間の `pk`、`ConsistentRead` は付けない）。`UnprocessedKeys` が残ったら外れとして扱う
- 捨てるのは `UpdateItemCommand`（`ADD version :one`）。複数のタグは `Promise.all`
- `bypass` でも版は読む（置き直す値に版を付けるため）
- 失敗のログは `Logger(SharedCache.name).warn`、文言は「共有キャッシュの〜に失敗しました: <name> <message>」

- [ ] **Step 4: 通るのを確かめる**

Run: `npx vitest run src/core/modules/shared-cache` と `npx tsc --noEmit -p tsconfig.json` と `npx eslint src/core/modules/shared-cache`
Expected: PASS

- [ ] **Step 5: コミット**

`feat: :sparkles: 実体をまたいで使う共有の読み取りキャッシュを足す`（package.json・package-lock.json・`src/core/modules/shared-cache/`）

---

### Task 2: trip-blocks の一覧に使い、書いたら捨てる

**Files:**
- Modify: `src/libs/trip-block/presentation/trip-block.v3.controller.ts`（`findManyByFilter`）
- Modify: `src/libs/trip-block/usecase/trip-block.v3.service.ts`（`findManyByFilter`・`#invalidateCalendars`・constructor）
- Modify: `src/libs/trip-block/trip-block.v3.module.ts`（`SharedCacheModule` を imports に）、CLI から `TripBlockV3Service` を使うモジュールがあればそれにも
- Create: `src/core/modules/shared-cache/bypass.ts`・`bypass.spec.ts`
- Test: `src/libs/trip-block/usecase/trip-block.v3.service.spec.ts`

**Interfaces:**
- Consumes: Task 1 の `SharedCache`
- Produces:
  ```ts
  // bypass.ts
  /** 要求の Cache-Control か Pragma に no-cache が付いていれば true */
  export function wantsFreshRead(headers: { cacheControl?: string; pragma?: string }): boolean;
  /** include・fields を、キーの順と項目の並びを揃えた 1 本の文字列にする（無ければ ''） */
  export function selectionCacheKey(params: { include?: unknown; fields?: unknown }): string;
  ```
  `TripBlockV3Service.findManyByFilter(params: { calendarId; tripDirection; include?; fields?; bypassCache?: boolean })`

- [ ] **Step 1: 失敗するテストを書く**

`bypass.spec.ts`：
- `wantsFreshRead`：`'no-cache'`・`'max-age=0, no-cache'`・pragma `'no-cache'` → true。`undefined`・`'max-age=0'`・`'no-store'` → false
- `selectionCacheKey`：`{ fields: { time: 'b,a', trip: 'x' } }` と `{ fields: { trip: 'x', time: 'a,b' } }` が同じ。`include: 'trips.times,trips'` と `'trips,trips.times'` が同じ。何も無ければ `''`

`trip-block.v3.service.spec.ts` に足す（`SharedCache` は `getOrLoad`・`invalidate` を `vi.fn` にした偽物。`getOrLoad` は渡された `load` を呼んで返す）：
- `一覧は namespace trip-blocks・key [calendarId, 方向, selectionCacheKey]・タグ calendar:<id> で共有キャッシュを通す`
- `bypassCache を getOrLoad の bypass に渡す`
- `include・fields が無い一覧もキャッシュを通す`
- 既存の書き込みのテスト（`#invalidateCalendars` が `cdnInvalidation.invalidate` を呼ぶもの）の隣に：`書いたら同じタグで sharedCache.invalidate も呼ぶ`
- 書く前の検査（`#validateNextSegments`）は `itinerarySegmentQuery.findManyByCalendarId` を直に呼ぶまま（`getOrLoad` を通らない）

- [ ] **Step 2: 失敗を確かめる**

Run: `npx vitest run src/core/modules/shared-cache/bypass src/libs/trip-block/usecase/trip-block.v3.service`
Expected: FAIL

- [ ] **Step 3: 書く**

- controller の `findManyByFilter` で `@Headers('cache-control')`・`@Headers('pragma')` を受け、`bypassCache: wantsFreshRead(...)` を service に渡す
- service の `findManyByFilter` は、今の分岐（selection の有無）を `load` の中に入れて `sharedCache.getOrLoad` で包む。`parseSelection` の検め（422）は `getOrLoad` の外で先に行う（不正な要求をキャッシュに触らせない）
- `#invalidateCalendars` は `Promise.all([cdnInvalidation.invalidate({ tags }), sharedCache.invalidate({ tags })])`（タグは同じ `calendarCacheTags(calendarIds)`）

- [ ] **Step 4: 通るのを確かめる**

Run: `npx vitest run src/core/modules/shared-cache src/libs/trip-block` と `npx tsc --noEmit -p tsconfig.json` と `npx eslint src/libs/trip-block src/core/modules/shared-cache`
Expected: PASS

- [ ] **Step 5: コミット**

`perf: :zap: 列車のまとまりの一覧を共有キャッシュから返す`

---

### Task 3: 運用の区間を読む所に使う

**Files:**
- Create: `src/libs/operation/usecase/itinerary-segment.reader.ts`・`itinerary-segment.reader.spec.ts`
- Modify: `src/libs/operation/operation.libs.module.ts`（`ItinerarySegmentReader` を providers・exports に、`SharedCacheModule` を imports に）
- Modify: 区間を読む所を `ItinerarySegmentReader` に替える：`src/libs/operation/usecase/operation.v3.service.ts`（`findManyItineraryLinks`・`findManyNextSegmentCandidates`）、`src/libs/operation-sighting/usecase/operation-sighting.v3.service.ts`（投稿の検査）、`operation-sighting.v3.time-cross-section.service.ts`、`operation-sighting.v3.list.service.ts`
- 替えない：`src/libs/trip-block/usecase/trip-block.v3.service.ts` の `#validateNextSegments`（`ItinerarySegmentQuery` を直に使う）

**Interfaces:**
- Consumes: Task 1 の `SharedCache`、既存の `ItinerarySegmentQuery.findManyByCalendarId({ calendarId }): Promise<ItinerarySegment[]>`
- Produces: `@Injectable() class ItinerarySegmentReader { findManyByCalendarId(params: { calendarId: string }): Promise<ItinerarySegment[]> }`（namespace `itinerary-segments`・key `[calendarId]`・タグ `calendar:<calendarId>`）

- [ ] **Step 1: 失敗するテストを書く**

`itinerary-segment.reader.spec.ts`：
- `namespace itinerary-segments・key [calendarId]・タグ calendar:<calendarId> で getOrLoad し、load は ItinerarySegmentQuery を呼ぶ`

書き換える service の spec では、差し替える依存を `ItinerarySegmentQuery` から `ItinerarySegmentReader` に替える（期待する振る舞いは変えない）。

- [ ] **Step 2: 失敗を確かめる**

Run: `npx vitest run src/libs/operation src/libs/operation-sighting`
Expected: FAIL

- [ ] **Step 3: 書く**

`ItinerarySegment` は JSON にして戻しても同じ形（数・文字列・null だけ）であることを確かめる。違う型（Date など）があれば止めて報告する。

- [ ] **Step 4: 通るのを確かめる**

Run: `npx vitest run src/libs src/core` と `npx tsc --noEmit -p tsconfig.json` と `npm run lint`
Expected: PASS

- [ ] **Step 5: コミット**

`perf: :zap: 運用の区間を共有キャッシュから読む`

---

### Task 4: 手で消す CLI

**Files:**
- Create: `src/core/modules/shared-cache/shared-cache.cli.command.ts`・`shared-cache.cli.module.ts`・`shared-cache.cli.command.spec.ts`
- Modify: `src/routes/cli-routing.module.ts`（imports に `SharedCacheCliModule`）

**Interfaces:**
- Consumes: Task 1 の `SharedCache.invalidate`・`invalidateNamespace`
- Produces: `npm run cli -- shared-cache invalidate --namespace <名前空間>`、`--tag <タグ>`（どちらか 1 つ以上・複数回可）

- [ ] **Step 1: 失敗するテストを書く**

- `--namespace trip-blocks で invalidateNamespace を呼ぶ`
- `--tag calendar:a --tag calendar:b で invalidate を 2 つのタグで呼ぶ`
- `どちらも無ければ呼ばずに exitCode 1`
- `テーブル名が無ければ、何もしない旨を出して exitCode 1`（手元の CLI で本番を消したつもりにならないため）

- [ ] **Step 2〜4:** `npx vitest run src/core/modules/shared-cache` → FAIL → 書く（`nest-commander` の `@SubCommand`・`@Option`。`operation-sighting.cli.command.ts` にそろえる） → PASS

- [ ] **Step 5: コミット**

`feat: :sparkles: 共有キャッシュを手で捨てる CLI を足す`

---

### Task 5: 本番の資源と ADR

**Files:**
- Modify: `serverless.ts`（`resources.Resources` にテーブル、`provider.iam.role.statements` に権限、`provider.environment` に `SHARED_CACHE_TABLE_NAME`）
- Create: `docs/adr/0021-shared-read-cache.md`
- Modify: `CLAUDE.md`（「環境設定」に 1 項目）

- [ ] **Step 1: `serverless.ts` に足す**

- テーブル `SharedCacheTable`：`AWS::DynamoDB::Table`、`TableName: '${param:prefix}-shared-cache-table'`、`BillingMode: PAY_PER_REQUEST`、`AttributeDefinitions: [{ AttributeName: 'pk', AttributeType: 'S' }]`、`KeySchema: [{ AttributeName: 'pk', KeyType: 'HASH' }]`、`TimeToLiveSpecification: { AttributeName: 'expiresAt', Enabled: true }`
- 権限：`dynamodb:GetItem`・`dynamodb:BatchGetItem`・`dynamodb:PutItem`・`dynamodb:UpdateItem`、Resource は `{ 'Fn::GetAtt': ['SharedCacheTable', 'Arn'] }`
- 環境変数：`SHARED_CACHE_TABLE_NAME: { Ref: 'SharedCacheTable' }`

- [ ] **Step 2: 確かめる**

Run: `npx tsc --noEmit -p tsconfig.json`（serverless.ts も型で見る。対象に入っていなければ `npx tsc --noEmit serverless.ts --module nodenext --moduleResolution nodenext --skipLibCheck`）
Expected: エラーなし。`npx serverless print` は AWS の認証が要るので流さない（デプロイはユーザーの許可の後）

- [ ] **Step 3: ADR-0021 を書く**

既存の ADR の形にそろえる。中身は spec の「なぜやるか」（Egress の実測と実体の作り直しの実測）、決めたこと（DynamoDB・タグと名前空間の版・24 時間・380KB・`no-cache` の取り直し・素通しの条件）、選ばなかった案（実体ごとのメモリ・S3・CloudFront の共有・GSI で捨てる案、それぞれの理由）、後で考えること（問い合わせを分けて 1 回の量を減らす）。

- [ ] **Step 4: `CLAUDE.md` に足す**

「環境設定」に：共有キャッシュ - `SHARED_CACHE_TABLE_NAME` が空なら素通し。読み取りを足すときは `SharedCache.getOrLoad` にキーとタグ（CDN の失効と同じ名前）を渡し、書き込みの usecase は `cdnInvalidation.invalidate` の隣で `sharedCache.invalidate` を同じタグで呼ぶ。手で捨てるのは `npm run cli -- shared-cache invalidate`（ADR-0021）。

- [ ] **Step 5: コミット**

`build: :construction_worker: 共有キャッシュのテーブルと権限を足す`（serverless.ts）と `docs: :memo: 共有の読み取りキャッシュの ADR を書く`（ADR・CLAUDE.md）の 2 つに分ける

---

### Task 6: 手元の通しの確認

**Files:** なし（`.context/` にメモだけ）

- [ ] **Step 1:** `docker run -d --rm -p 8000:8000 --name ddb-local amazon/dynamodb-local` を立て、`aws dynamodb create-table --endpoint-url http://localhost:8000 ...`（Task 5 と同じキー）でテーブルを作る
- [ ] **Step 2:** 手元の api を `SHARED_CACHE_TABLE_NAME` と `AWS_ENDPOINT_URL_DYNAMODB=http://localhost:8000`（ダミーの認証情報）で起動し、`/v3/trip-blocks` を同じ条件で 2 回取る。pg_stat_statements（手元の DB）で trip-blocks の回数が 1 しか増えないこと、`Cache-Control: no-cache` を付けると増えること、`npm run cli -- shared-cache invalidate --tag calendar:<id>` の後に増えることを見る
- [ ] **Step 3:** 結果をユーザーに報告する（コミットはしない）
