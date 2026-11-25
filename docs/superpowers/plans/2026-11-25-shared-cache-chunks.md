# 共有キャッシュの値を分けて置く Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 共有キャッシュの値を brotli 6 で縮め、350KB ごとに最大 4 項目へ分けて置けるようにする。

**Architecture:** `SharedCache`（`src/core/modules/shared-cache/shared-cache.ts`）の中だけを変える。読みは今の `BatchGetItem` 1 回に続きの pk を足し、書きは `PutItem` を `BatchWriteItem` 1 回に替える。使う側の API は変えない。

**Tech Stack:** NestJS 12・TypeScript strict・ESM・`@aws-sdk/client-dynamodb`・Node の `zlib`（brotli）・Vitest

**Spec:** `docs/superpowers/specs/2026-11-25-shared-cache-chunks-design.md`（元の設計は `docs/superpowers/specs/2026-11-25-shared-cache-design.md` と ADR-0021）

## Global Constraints

- 圧縮は brotli 品質 6、`BROTLI_PARAM_SIZE_HINT` に素の長さを渡す
- `SHARED_CACHE_PART_BYTES = 350 * 1024`、`SHARED_CACHE_MAX_PARTS = 4`。`SHARED_CACHE_MAX_BODY_BYTES` は外す
- 先頭の pk は今と同じ `entry#<namespace>#<sha256(keyParts)>`。続きは `entry#<namespace>#<hash>#<1〜3>`
- 先頭は `namespace`・`keyParts`・`body`・`parts`（N）・`writeId`（S・`randomUUID()`）・`tagVersions`・`expiresAt`。続きは `body`・`writeId`・`expiresAt`
- `parts` を持たない項目は外れ（読み替えは作らない）
- 当たりは「期限・版（今の条件）」に加え「続き 1〜parts-1 がそろい、どれも先頭と同じ `writeId`」
- 読みは `BatchGetItem` 1 回（先頭＋続き 3＋タグ＋名前空間）。bypass のときは値の項目（先頭も続きも）を読まない
- 書きは `BatchWriteItem` 1 回。`UnprocessedItems` が残ったら warn を出して応答は返す
- 350KB × 4 を超えたら置かず、warn を出して load の結果をそのまま返す（写さない。今と同じ）
- 予算 1.5 秒・クライアント設定・「何が起きても reject しない／応答を変えない」は今のまま
- Lambda の権限は `BatchGetItem`・`BatchWriteItem`・`UpdateItem`（`PutItem` を外す）
- 一時ファイルは `.context/`。テストは SWC のためサンドボックス外で流す

## Review Focus

1. 前より少ない切れ端で書き直した後に、古い続きが残っていても当たり値が正しい（新しい値だけをつなぐ）— Task 1 のテスト「切れ端を減らして書き直すと、残った古い続きは使わない」
2. 先頭だけ書けて続きが書けなかった（`UnprocessedItems`）ときに、次の読みが外れになる — Task 1 のテスト「続きが欠けていれば外れ」と「UnprocessedItems が残っても値を返す」
3. 2 つの書き込みが混ざった（先頭と続きの `writeId` が違う）ときに外れになる — Task 1 のテスト「writeId が違えば外れ」
4. ちょうど 350KB・ちょうど 1.4MB の境目 — Task 1 のテスト「350KB ちょうどは 1 切れ・1 バイト超えると 2 切れ」「1.4MB ちょうどは置く・超えると置かない」
5. デプロイの直後に残っている gzip の古い値 — Task 1 のテスト「parts の無い古い項目は外れ」

---

### Task 1: 分けて置き、brotli で縮める

**Files:**
- Modify: `src/core/modules/shared-cache/shared-cache.ts`
- Test: `src/core/modules/shared-cache/shared-cache.spec.ts`

**Interfaces:**
- Consumes: なし（`getOrLoad`・`invalidate`・`invalidateNamespace` の形は変えない）
- Produces: export する定数 `SHARED_CACHE_PART_BYTES: number`（358_400）、`SHARED_CACHE_MAX_PARTS: number`（4）。`SHARED_CACHE_MAX_BODY_BYTES` は消す

- [ ] **Step 1: テストの差し替え先を直す**

spec の send の差し替え（70 行付近）を、`PutItemCommand` の代わりに `BatchWriteItemCommand` の `RequestItems[table][].PutRequest.Item` を表に書く形にする。`BatchGetItemCommand` は今どおり表から返す。既存のテストで `PutItemCommand` を数えている所は `BatchWriteItemCommand` に替える。gzip で body を作っている所（壊れた body のテスト）は brotli と `parts`・`writeId` 付きの項目にする。

- [ ] **Step 2: 失敗するテストを足す**

既存の書き方（`sent(...)`、表の差し替え）にそろえて、次を足す。

```ts
it('定数', () => {
    expect(SHARED_CACHE_PART_BYTES).toBe(350 * 1024);
    expect(SHARED_CACHE_MAX_PARTS).toBe(4);
});
it('切れ端 2 つ以上の値も置いて当たる（2 回目は load を呼ばない）', ...);       // 素の JSON が乱数で 350KB を超えて縮まない値を使う
it('350KB ちょうどは 1 切れ、1 バイト超えると 2 切れで書く', ...);             // 縮めた後の長さで決まる。brotli を spy して長さを固定してよい
it('1.4MB ちょうどは置き、1 バイト超えると置かずに load の結果をそのまま返す', ...); // 置かないときは toBe で同じ参照
it('続きが欠けていれば外れとして load を呼ぶ', ...);
it('writeId が先頭と違う続きがあれば外れとして load を呼ぶ', ...);
it('parts の無い古い項目（gzip の値）は外れとして load を呼ぶ', ...);
it('切れ端を減らして書き直すと、残った古い続きは使わない', ...);               // 3 切れ → 1 切れで書き直し、#1・#2 が表に残ったままでも新しい値を返す
it('読みの BatchGetItem は先頭と続き #1〜#3 とタグ・名前空間を 1 回で取る', ...); // Keys の pk の集合を固定
it('bypass なら先頭も続きも Keys に入れない', ...);
it('UnprocessedItems が残っても値を返し、warn を出す', ...);
it('brotli で戻せない body は外れとして load を呼ぶ', ...);
```

- [ ] **Step 3: 落ちるのを見る**

Run: `npx vitest run src/core/modules/shared-cache`（dangerouslyDisableSandbox）
Expected: 足したテストが FAIL

- [ ] **Step 4: 実装する**

- 縮める：`brotliCompressSync(json, { params: { [BROTLI_PARAM_QUALITY]: 6, [BROTLI_PARAM_SIZE_HINT]: Buffer.byteLength(json) } })`。戻す：`brotliDecompressSync`
- 切る：`body.subarray(i * PART_BYTES, (i + 1) * PART_BYTES)`。`parts = Math.max(1, Math.ceil(len / PART_BYTES))`
- 読む：`#batchGet` に `entryPk` と `${entryPk}#1`〜`#3` を渡す（bypass なら渡さない）。`#isHit` は今の条件に加えて `parts`（1〜4 の整数）・`writeId` の有無を見る。続きは `#1`〜`#parts-1` を取り、`writeId` と `body.B` を確かめ、順につなぐ
- 書く：`BatchWriteItemCommand` 1 回。先頭に `parts`・`writeId`・`namespace`・`keyParts`・`tagVersions`、続きに `body`・`writeId`、すべてに同じ `expiresAt`。`UnprocessedItems` が空でなければ `#warn('書き込み', ...)`
- クラスと定数のコメント（「380KB」「PutItem」）を今の振る舞いに直す

- [ ] **Step 5: 通るのを見る**

Run: `npx vitest run src/core/modules/shared-cache src/libs/trip-block src/libs/operation`
Expected: PASS。あわせて `npx eslint` と `npx prettier --check` を変えたファイルに

- [ ] **Step 6: コミット**

`perf: :zap: 共有キャッシュの値を brotli で縮め、分けて置く`

### Task 2: 権限と記録

**Files:**
- Modify: `serverless.ts:116-120`（Lambda の DynamoDB の権限）
- Modify: `docs/adr/0021-shared-read-cache.md`（節を足す）
- Modify: `docs/superpowers/specs/2026-11-25-shared-cache-design.md` の「足すもの」の権限の行と、380KB の決まり（新しい spec を指す 1 行に）

**Interfaces:**
- Consumes: Task 1 の定数名
- Produces: なし

- [ ] **Step 1: 権限を替える**

`'dynamodb:PutItem'` を `'dynamodb:BatchWriteItem'` にする。順は `BatchGetItem`・`BatchWriteItem`・`UpdateItem`。`npx eslint serverless.ts`・`npx prettier --check serverless.ts`・`npm run build` が通ること。`serverless print`・deploy は流さない

- [ ] **Step 2: ADR-0021 に節を足す**

見出し「値を分けて置き、brotli で縮める（2026-11-25 追記）」。新しい spec の「なぜやるか」「測ったこと」の表（brotli 6・11、列の形、UUID）、「方針」、権限の変更、古い gzip の値は外れにすることを、常体で短く書く。380KB と PutItem を書いた既存の文には「（追記で変更）」を添える

- [ ] **Step 3: コミット**

`build: :construction_worker: 共有キャッシュの権限を BatchWriteItem に替える` と `docs: :memo: 共有キャッシュを分けて置く変更を ADR に足す` の 2 つに分ける

### Task 3: 手元の通し（コントローラーがやる・コミットなし）

- [ ] DynamoDB Local（`ddb-local`・8000）の `local-shared-cache-table` を使い、手元の api をこのブランチから `SHARED_CACHE_TABLE_NAME`・`AWS_ENDPOINT_URL_DYNAMODB` を付けて起動する
- [ ] `include=trips.times`（`fields` 無し）の一覧を 2 回取り、2 回目に手元の DB（`supabase_db_sotetsu-lab-v3-api`）の `pg_stat_statements` で trip_blocks の回数が増えないこと、DynamoDB に `#1` の項目ができることを見る
- [ ] client と同じ `fields` の一覧も 2 回取り、1 切れで当たることを見る
