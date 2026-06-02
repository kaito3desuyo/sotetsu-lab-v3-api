# ADR-0001: タイムクロスセクションロジックの再設計

- **日時**: 2026-06-01
- **Agent**: claude-sonnet-4-6
- **ステータス**: 採用済み
- **ブランチ**: fix/time-cross-section-logic

---

## 背景

`findOneTimeCrossSectionByOperationNumber` / `findOneTimeCrossSectionByFormationNumber` の2つのメソッドには、以下の問題があった。

1. **N+1クエリ構造**: ループ1ステップ = 1クエリ。ダイヤ改正が年1回なら最悪365クエリになる。
2. **ループ上限の誤り**: `diffDays`（今日 - latestSightingの鉄道日）をループ上限にしていたが、「今日のopNに入ってくる流れを遡る」こととlatestSightingの日付は本来無関係。
3. **非対称性**: 運用番号側と編成番号側でロジックが異なり、挙動が一致しないケースがあった。
4. **デッドコード**: `findManyByOperationNumbersAndSightingTimeRange` がクエリクラスに存在していたが、サービスから呼ばれていなかった。

## 決定

### 1. 2クエリ構成への移行

ループ内のN+1クエリを廃止し、以下の2クエリ構成に変更した。

- **クエリ1**: `findOneLatestByOperationNumberBeforeTime` / `findOneLatestByFormationNumberBeforeTime`（既存）— 最終目撃を1件取得
- **クエリ2**: `findManyLatestGroupByFormationByOperationNumbersAndSightingTimeRange`（新規）— 群メンバー全員のキャッシュを一括取得

その後アプリ側で `buildCirculationPath` を使ってフィルタリングし、`most-recent-wins` ソートで候補を選ぶ。

### 2. `operation_sighting_latest_caches` テーブルの導入

編成番号をキーとする「最終有効目撃キャッシュ」テーブルを新設した。1編成につき1行（UNIQUE on `formation_number`）。目撃情報のPOST時・CLIの`rebuildLatestCache`コマンド時に更新される。このテーブルから群メンバーのキャッシュを一括取得することで、N+1を解消した。

### 3. ヘルパー関数の整備

- **`buildCirculationPath(start, steps)`**: 循環マップを`steps`回たどり、`{path, expectedOperationNumber}`を返す。途中でマップが途切れたら`null`。
- **`getGroupMembers(start, map, maxSteps=9)`**: 逆マップを使って群メンバー全員を列挙する。

### 4. 対称ロジックへの統一

運用番号側・編成番号側ともに以下の共通パターンを採用した。

```
群メンバーのキャッシュを一括取得
→ buildCirculationPath で「今日の期待opN」を計算
→ キャッシュの中から同じ期待opNに届く候補を抽出
→ sightingTime 降順でソートして最新を選択
```

### 5. デッドコード削除

`OperationSightingLatestCacheQuery.findManyByOperationNumbersAndSightingTimeRange` を削除した。

### 6. 書き込み側（post / invalidate / restore）のリファクタリング

`post` / `invalidate` / `restore` の3メソッドについて、キャッシュ更新ロジックを以下の方針で抜本的に整理した。

#### `CacheAction` 判別ユニオンの導入

キャッシュに対して「何をするか」の決定をトランザクション開始前に確定させる型を導入した。

```typescript
type CacheAction =
    | { type: 'none' }
    | { type: 'upsert';   cacheId: string | undefined; formationNumber: string; operationNumber: string }
    | { type: 'rollback'; cacheId: string;             formationNumber: string; operationNumber: string; operationSightingId: string }
    | { type: 'delete';   formationNumber: string };
```

- `upsert` — 「今保存した目撃」をキャッシュに指す（`post` / `restore` で使用）
- `rollback` — 「ひとつ前の有効目撃」へキャッシュを差し戻す（`invalidate` で使用）。`operationSightingId` を型に required で持つことで `upsert` との意味の違いを型レベルで明示する
- `delete` — 前の有効目撃が存在しない場合にキャッシュ行を削除する

トランザクション内では `#applyCacheAction(action, savedId, manager)` を呼ぶだけになり、3メソッドのトランザクション構造が均一になった。

#### `UnexpectedError` の導入

目撃情報 DTO の `formation` / `operation` フィールドが null になるのはデータ不整合（アプリバグ or DB破損）であり、ユーザーエラーではない。これを `UseCaseError`（HTTP 422）と明確に区別するため `UnexpectedError` クラスと専用フィルターを新設した。

- `UnexpectedError` は `HttpException` を継承せず、`UnexpectedErrorFilter` が HTTP 500 を明示的に返す
- `invalidate` / `restore` では `dto.formation` / `dto.operation` が null の場合に即座に `UnexpectedError` を throw し、null を無音スキップする挙動を廃止した
- `invalidate` において `prevSighting` が non-null なのに `prevSighting.operation` が null の場合も同様に `UnexpectedError` を throw する

---

## カレンダーとの整合性

クエリの `startTime: calendarStartDate` フィルターにより、キャッシュ検索は**現行ダイヤ改正日以降の目撃のみ**に限定される。ハードコードの循環マップは現行ダイヤのルールを反映しているため、旧ダイヤの目撃情報が誤評価されることはない。

`findOneBySpecificDate(today)` が返す `calendar.startDate` は現行改正日であり、`[calendarStartDate, searchTime]` ウィンドウは常に単一ダイヤ改正期間内に収まる。

---

## 却下した代替案

- **`DISTINCT ON` をクエリ側で使う案**: PostgreSQL固有構文を使えばDBサイドでグルーピングができるが、`operation_sighting_latest_caches` キャッシュテーブルの設計によりアプリ側で十分な最適化が達成できたため不採用。
- **ループ構造を維持しつつ上限を改正日に変える案**: ループ上限の誤りは修正できるが、N+1クエリ問題が残る。根本解決にならないため不採用。

---

## 影響範囲

| ファイル | 変更内容 |
|---|---|
| `src/libs/operation-sighting/usecase/operation-sighting.v3.service.ts` | `findOneTimeCrossSectionBy*` 全面書き換え、ヘルパー関数追加、`post`/`invalidate`/`restore` の `CacheAction` 方式へのリファクタリング |
| `src/libs/operation-sighting/usecase/operation-sighting.v3.service.spec.ts` | モック修正、テスト追加 |
| `src/libs/operation-sighting/infrastructure/query/operation-sighting-latest-cache.query.ts` | `findManyByOperationNumbersAndSightingTimeRange` 削除、`findManyLatestGroupByFormationByOperationNumbersAndSightingTimeRange` 追加 |
| `src/libs/operation-sighting/usecase/operation-sighting.cli.service.ts` | `rebuildLatestCache` をレイヤードアーキテクチャに移行 |
| `src/migrations/*` | `operation_sighting_latest_caches` テーブル追加 |
| `src/core/classes/unexpected-error.ts` | `UnexpectedError` クラス新規作成 |
| `src/core/filters/unexpected-error.filter.ts` | `UnexpectedErrorFilter` 新規作成（HTTP 500 を返す） |
| `src/app.ts` | `UnexpectedErrorFilter` をグローバル登録 |
