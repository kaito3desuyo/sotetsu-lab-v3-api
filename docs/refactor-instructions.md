# refactor-instructions.md — sotetsu-lab-v3-api

> 作成日: 2026-06-11 / 調査者: Claude (Fable 5)
> 対象リポジトリ: `sotetsu-lab-v3-api`（このファイルが置かれているリポジトリ）
>
> この指示書は、実装担当モデルが**設計判断をせずに**完遂できるよう、エンドポイント仕様表（Phase 4）まで具体化してある。表にない判断が必要になったら、自分で決めずに Stop And Ask Conditions に従って停止すること。

## Objective

既存の API 挙動・レスポンス形式・DB スキーマを一切変えずに、以下を達成する。

1. 壊れたテンプレート由来のテストを実態に合わせて修復し、CI で常時実行できる状態にする
2. 明白な死コード・テンプレート残骸を整理する
3. ドメインモジュール間の構成の不揃い（命名・配置）を統一する
4. **client が依存する残りの v2 エンドポイントを置き換える v3 エンドポイントを新設する**（`@dataui/crud` / nestjsx 系のクエリ規約に依存しない、既存 v3 と同じ明示的ハンドラー方式。ユーザー承認済みのスコープ）
5. それ以外の大きな設計変更（v2 API の削除自体、strict 化、依存更新）は**提案に留める**

見た目の綺麗さは目的ではない。「既存仕様を壊さず、今後変更しやすくする」ことが目的である。

## Project Understanding

- **何か**: 相鉄線の運行・編成・時刻表データを提供する REST API。NestJS 10 + TypeORM 0.3 + PostgreSQL。AWS Lambda に Serverless Framework でデプロイされる（`serverless.ts`、CI はバージョンタグ push で `npm run deploy`）。
- **エントリーポイント**:
  - HTTP: `src/main.ts` → `src/app.ts` の `createApp()`（dayjs を Asia/Tokyo に固定、ValidationPipe、`UseCaseErrorFilter` / `UnexpectedErrorFilter` をグローバル適用）
  - CLI: `src/cli.ts`（nest-commander。`src/routes/cli-routing.module.ts` 経由で trip-block / operation-sighting のコマンドを提供）
- **ルーティング**: `src/routes/api-routing.module.ts` が `/v2`（12 コントローラー、`@dataui/crud` ベースの汎用 CRUD）と `/v3`（7 コントローラー、明示的ハンドラー + RBAC）の 2 系統を束ねる。
- **認証**: `src/core/modules/auth/auth.guard.ts` — Cognito アクセストークンを `aws-jwt-verify` で検証。ヘッダーは `x-sotetsu-lab-authorization`（フォールバックで `authorization`）。JWKS は `src/core/modules/auth/jwks.json` を `readFileSync(__dirname + '/jwks.json')` で読み込みキャッシュする（ビルド成果物への同梱が前提）。
- **RBAC**: `src/core/modules/rbac/` — JWT の scope と `Role` enum を突合。v3 コントローラーのみ使用。
- **DB**: `src/core/configs/database.config.ts`。`synchronize: false`、migration は `db/migrations/`（18 本）のみが対象。`extra: { max: 1 }` は Lambda 前提のコネクション設定。
- **ドメイン構造**: `src/libs/<domain>/` に `domain / infrastructure / presentation / usecase` のレイヤード構成。12 ドメイン。
- **エラー方針**: ドメイン層は `UseCaseError`、データ不整合は `UnexpectedError`。各フィルターが HTTP レスポンスに変換。
- **規模**: TS 約 270 ファイル / 約 12,000 行。spec ファイルは 3 つのみ。

## Behaviors To Preserve（絶対に壊してはいけない挙動）

1. **/v2 系エンドポイント全部**。クライアント（sotetsu-lab-v3-client）の `src/app/libs/` 配下 12 ファイルがまだ `/v2/` を呼んでいる。**v2 コントローラー・サービス・DTO の削除や変更は禁止**（クライアント側の v3 移行完了が前提。本指示書のスコープ外）。
2. **/v3 系のレスポンス形式と RBAC 判定**。特に `operation-sighting.v3.service.ts` の TimeCrossSection / latest-cache ロジック（ADR `docs/adr/0001-time-cross-section-logic-rewrite.md` と `docs/superpowers/plans/2026-05-30-operation-sighting-latest-cache.md` が仕様文書。既存 spec 2 本がこの領域の安全網）。
3. **認証ヘッダー名** `x-sotetsu-lab-authorization` と `authorization` フォールバック、JWKS のファイル同梱方式。
4. **ページネーションヘッダー**（`src/core/utils/pagination-header.ts` の `addPaginationHeaders`）。
5. **DB スキーマと migration 履歴**。`db/migrations/` の既存ファイルは改変禁止。エンティティ（`*.model.ts`）の変更は migration を伴うため本リファクタリングでは行わない。
6. **タイムゾーン Asia/Tokyo 固定**（`app.ts` / `cli.ts` の dayjs 設定）。
7. **エラーフィルターの変換規則**（UseCaseError → HTTP ステータスのマッピング）。
8. **CLI コマンド**（nest-commander 経由）の入出力。
9. **`patches/` と `@dataui/crud`**。patch-package による修正が当たっている。依存のバージョン変更・patch の削除は禁止。

## Non-Negotiables（作業上の絶対ルール）

- 最初に `git status` を確認する。未コミット変更があれば作業を始めずに報告する（自分の変更と混ぜない）。
- master から作業ブランチを切る。master へ直接コミットしない。`git push` / `git merge` は指示がない限り行わない。
- 編集前に Baseline Commands を実行し、結果（成功・失敗・件数）を記録する。
- 変更は小さく戻しやすい単位でコミットする。
- 無関係な整形・ついでのリファクタリング・コメント追加をしない。
- 既存挙動を勝手に変えない。挙動変更を伴う「改善」は提案として報告に書くだけにする。
- 正しさが判断できない場合は実装を止めて質問する。
- 各フェーズ完了ごとに検証コマンドを実行する。
- 最後に、実行したコマンドと結果をすべて報告する。

## Stop And Ask Conditions（即時停止して質問する条件）

- v2 / v3 どちらのコントローラーであれ、**既存**レスポンスの JSON 構造を変えないと進められない場合
- エンティティ（`*.model.ts`）や migration に手を入れたくなった場合
- Phase 4 の仕様表（4-B）に載っていない設計判断が必要になった場合（**自分で設計しない**）
- v2 と v3 のレスポンス比較（4-D 手順 3）で意図しない差分が出て、解消方法が仕様表から導けない場合
- `patches/` や `@dataui/crud` 系依存に触れる必要が出た場合（注: 新設 v3 では使わないだけであり、v2 が使っている限り削除はしない）
- `tsconfig.json` への `strict` 系オプション追加（影響が全ファイルに及ぶ。提案のみ）
- TypeScript / NestJS / TypeORM のバージョン更新（提案のみ）
- `serverless.ts`・デプロイ設定・`.github/workflows/` の動作に関わる変更（コメントアウト行の削除を除く）

## Baseline Commands（2026-06-11 時点の実測値）

```bash
npm test          # 既知の状態: Test Suites: 1 failed, 2 passed / Tests: 1 failed, 25 passed
                  # 失敗は src/app.controller.spec.ts のみ（NestJS テンプレート残骸。Phase 2 で修復対象）
npm run build     # nest build
npm run lint      # 注意: このスクリプトは --fix 付きでファイルを書き換える。
                  # ベースライン記録には npx eslint "{src,test}/**/*.ts" を --fix なしで使うこと
```

- E2E（`npm run test:e2e`）は `test/app.e2e-spec.ts` がテンプレート残骸（`'Hello World!'` を期待）かつ DB 接続が必要。ベースラインでは実行不要。
- DB が必要な動作確認はリポジトリ内の `docker-compose.yml` で Postgres を起動して行う。

## Debt Map（根拠付き）

| # | 負債 | 根拠 | 影響範囲 | リスク | 対応 |
|---|------|------|----------|--------|------|
| 1 | テンプレート残骸テストが常時失敗 | `src/app.controller.spec.ts`（`'Hello World!'` を期待。実装は `{message: 'Sotetsu Lab v3 API.'}` を返す）、`test/app.e2e-spec.ts` も同様 | テスト結果の信頼性 | 低 | **実装してよい** |
| 2 | 死コード: `AppService.getHello()` が `'Hello World aa!'` を返すが、`AppController` はこれを使っていない | `src/app.service.ts` / `src/app.controller.ts` | なし | 低 | **実装してよい**（`/` と `/health-check` のレスポンスは変えないこと） |
| 3 | README が NestJS テンプレートのまま | `README.md` | ドキュメント | 低 | **実装してよい**（CLAUDE.md の内容を基にプロジェクト固有の README を書く） |
| 4 | CI に lint / test ステップがなく、デプロイのみ。旧 ECS デプロイ手順が大量にコメントアウトで残存 | `.github/workflows/deploy-on-push-version-tags.yml` | 品質保証 | 低 | **実装してよい**（test ジョブ追加 + コメントアウト块の削除。デプロイステップ自体は変更禁止） |
| 5 | テスト不足: 270 ファイルに対し spec 3 本。operation-sighting 以外のドメインは無防備 | `find src -name "*.spec.ts"` → 3 件 | リファクタ全般の安全性 | - | **実装してよい**（Phase 2 で usecase 層を優先して追加） |
| 6 | ディレクトリ命名の不揃い: `operation-sighting/infrastructure/query/`（単数）vs 他ドメインの `queries/`（複数） | `src/libs/operation-sighting/infrastructure/query/` | 可読性 | 低 | **実装してよい**（import 修正のみで完結することを確認の上） |
| 7 | `operation-sighting.v3.service.ts` が 804 行・公開メソッド 8 個に肥大化 | `src/libs/operation-sighting/usecase/operation-sighting.v3.service.ts` | 当該ドメイン | 中 | **条件付き実装**: 既存 spec が緑のまま、private ヘルパーの抽出など純粋な機械的分割に限る。ロジック変更禁止 |
| 8 | v2/v3 の二重実装（12 + 7 コントローラー）。v3 が無いドメイン: agency, station, trip, trip-block, vehicle | `src/libs/*/presentation/` | API 全体 | 高 | **段階的実装**: Phase 4 で client が必要とする v3 エンドポイントを新設する（本スコープ）。**v2 の削除は client 移行のデプロイ完了後**であり本スコープ外 |
| 9 | `tsconfig.json` に strict 系が一切ない | `tsconfig.json` | 全ファイル | 高 | **提案のみ** |
| 10 | TypeScript 4.7 が NestJS 10 系に対して古い | `package.json` | ビルド全体 | 高 | **提案のみ** |
| 11 | 旧シード・旧 migration・バックアップが残存（計 700KB+、ランタイム未参照） | `db/backup/`, `db/oldSeedMigration/`, `db/oldTableMigration/` | なし | - | **対応不要**（ユーザー回答済み: 歴史的記録として保持する。**削除禁止**） |

## Implementation Phases

### Phase 0: 現状確認
1. `git status` を確認。未コミット変更があれば停止して報告。
2. 作業ブランチを作成。
3. Baseline Commands を実行し、結果を記録（特に `npm test` の失敗が「1 failed / 25 passed」と一致するか確認。一致しなければ停止して報告）。

### Phase 1: 明らかに安全な整理（Debt #1, #2, #3, #4）
- `src/app.controller.spec.ts` を実装の実際の挙動（`/` と `/health-check` が `{message: 'Sotetsu Lab v3 API.'}` 形式を返す）に合わせて書き直す。
- `test/app.e2e-spec.ts` を同様に修正する（DB 不要で実行できないなら、現実に即した期待値への修正のみ行い、実行は省略してよい）。
- `AppService.getHello()` の死コードを整理（コントローラーのレスポンスは不変）。
- README をプロジェクト実態に合わせて書き直す。
- CI ワークフローのコメントアウトされた旧 ECS ブロックを削除し、PR/push 時に `npm test` を回すジョブを追加する（デプロイジョブは触らない）。
- 検証: `npm test` が全緑、`npm run build` 成功。

### Phase 2: 安全網の拡充（Debt #5）
- usecase 層を優先して spec を追加する。対象優先度: `operation` > `trip-block` > `formation` > その他。既存の `operation-sighting.v3.service.spec.ts` のスタイル（リポジトリをモックし、入出力を検証）に従う。
- テストは現状の挙動を固定するもの（characterization test）であり、「あるべき挙動」を発明しない。挙動が怪しく見えても、まず現状を固定し、疑義は報告書に書く。
- 検証: `npm test` 全緑。

### Phase 3: 小さな責務分離・構成統一（Debt #6, #7）
- `query/` → `queries/` のディレクトリ名統一(import 修正を含めて 1 コミット)。
- `operation-sighting.v3.service.ts` の機械的分割（既存テストが緑のまま維持できる範囲のみ）。
- 検証: `npm test` 全緑、`npm run build` 成功、`npx eslint` で新規警告なし。

### Phase 4: v2 置き換え用 v3 エンドポイントの新設（Debt #8 前段・ユーザー承認済みスコープ）

**前提**: Phase 1〜2 完了（テストが信頼できる状態）であること。

**ギャップ分析は完了済み**（2026-06-11、client の全 v2 呼び出し元を実地調査済み）。以下の仕様表に従って実装すること。**この表にない設計判断が必要になった場合は、自分で設計せず停止して質問する。**

#### 4-A. 設計原則（全エンドポイント共通）

- 既存 v3 の流儀に厳密に従う。**参照実装**: 最小例 = `src/libs/formation/`（v3 controller / v3 service / query）、コマンド込みの例 = `src/libs/operation-sighting/`。
- 明示的ハンドラー + `AuthGuard`（+ 既存 v3 と同様に必要な箇所は `RBACGuard`） + class-validator DTO + usecase 層経由。`@dataui/crud` / `@dataui/crud-typeorm` は**使わない**。
- infrastructure のクエリは **TypeORM `createQueryBuilder`** で実装する（ユーザー指定。`calendar.query.ts` 等の既存 v3 クエリと同じ流儀）。
- レスポンス DTO の形は **v2 の同名リソースのレスポンスと同一**にする（client の `../sotetsu-lab-v3-client/src/app/libs/<domain>/infrastructure/models/*.model.ts` が期待形。読み取り専用で参照可）。ネストされたリレーションは下表の「含めるリレーション」をすべて埋める。
- ページネーションは**実装しない**（下表の呼び出し元はいずれも非ページングで全件取得している）。
- 下表にない機能（任意 filter、任意 join、任意 sort）は実装しない。
- v2 のコード（コントローラー・サービス・クエリ）には一切手を入れない。例外: trip-block（4-C 参照）。

#### 4-B. 新設エンドポイント仕様表

| # | エンドポイント | クエリ/パスパラメータ | 含めるリレーション | サーバー側ソート | 移行元（client の呼び出し元） |
|---|---|---|---|---|---|
| 1 | `GET /v3/agencies` | なし | なし | なし（v2 既定のまま） | `agency-list.state.ts`（空 qb） |
| 2 | `GET /v3/calendars?serviceName=` | `serviceName`（任意、string） | なし（filter 用に service を内部 join） | `startDate` ASC, `monday` DESC | `calendar-list.state.ts` |
| 3 | `GET /v3/stations` | なし | なし | なし（v2 既定のまま） | `operation-table.service.ts` / `timetable-station.service.ts`（空 qb） |
| 4 | `GET /v3/trip-classes?serviceId=`（**既存コントローラーへの追加**） | `serviceId`（任意、uuid）。**省略時は現行 v3 の挙動を 1 bit も変えない**こと | なし | なし（client 側でソートさせる） | `timetable-edit-form.service.ts` |
| 5 | `GET /v3/trips/station/:stationId?calendarId=&tripDirection=` | `stationId`（path, uuid）、`calendarId`（必須, uuid）、`tripDirection`（必須, 0/1） | `times`, `tripOperationLists` | `times.arrivalDays` ASC, `times.arrivalTime` ASC, `times.departureDays` ASC, `times.departureTime` ASC | `timetable-station.service.ts` の `fetchTrips` |
| 6 | `GET /v3/trip-blocks?calendarId=&tripDirection=` | 両方必須。`trips.calendarId` と `trips.tripDirection` で絞り込み | `trips`, `trips.times`, `trips.tripOperationLists`, `trips.tripOperationLists.operation`, `trips.tripClass` | `trips.times.departureDays` ASC, `trips.times.departureTime` ASC | `timetable-all-line.service.ts` の `fetchTripBlocksV2` |
| 7 | `GET /v3/trip-blocks/:id` | `id`（path, uuid） | #6 と同じ（superset 固定） | #6 と同じ | `timetable-all-line.service.ts`（secondQb）、`timetable-station.service.ts`、`timetable-edit-form.service.ts` |
| 8 | `POST /v3/trip-blocks/bulk` | body: `CreateTripBlockDto[]`（v2 と同一 DTO） | 応答は #7 相当の形 ×件数 | - | `timetable-edit-form.service.ts` の `createTripBlocks` |
| 9 | `PUT /v3/trip-blocks/:id` | body: `ReplaceTripBlockDto`（v2 と同一） | 応答は #7 相当 | - | 同 `replaceTripBlock` |
| 10 | `PATCH /v3/trip-blocks/:id/add-trip` | body: `AddTripToTripBlockDto`（v2 と同一） | 応答は #7 相当 | - | `timetable-all-line.service.ts` |
| 11 | `PATCH /v3/trip-blocks/:id/delete-trip` | body: `DeleteTripFromTripBlockDto`（v2 と同一） | 応答は #7 相当 | - | 同上 |
| 12 | `GET /v3/services?serviceName=` | `serviceName`（任意、string） | なし | なし | `service-list.state.ts` |
| 13 | `GET /v3/services/:id/stations` | `id`（path, uuid） | 各 station に `routeStationLists`, `routeStationLists.route`, `stops` を**常に**含める（呼び出し元 3 箇所の join の和集合で固定） | なし（client 側でソートさせる） | `operation-route-diagram.service.ts` / `timetable-all-line.service.ts` / `timetable-edit-form.service.ts` |
| 14 | `GET /v3/routes?serviceName=` | `serviceName`（任意、string。`operatingSystems.service.serviceName` で filter） | `routeStationLists`, `routeStationLists.station` | `routeStationLists.stationSequence` ASC | `route-station-list.state.ts` |
| 15 | `GET /v3/formations/as/of/:date` | `date`（path, YYYY-MM-DD） | なし | v2 `formation.v2.service.findManyBySpecificDate` と同一 | `todays-formation-list.state.ts` |
| 16 | `GET /v3/operations/:id/trips` | `id`（path, uuid） | 応答 `{ operation, trips[] }`。`operation` に `calendar` を**常に**含める。`trips` は v2 `/v2/operations/:id/trips` と同形 | v2 と同一 | `operation-route-diagram.service.ts` / `operation-table.service.ts` |

実装上の補足:
- #5 の trip 絞り込み条件は v2 で client が組んでいた検索条件を**サーバー側に固定実装**する: `calendarId = :calendarId AND tripDirection = :tripDirection AND times.stationId = :stationId AND (times.pickupType = 0 OR times.dropoffType = 0 OR (times.pickupType = 1 AND times.dropoffType = 1 AND (times.departureTime IS NOT NULL OR times.arrivalTime IS NOT NULL)))`（出典: client `timetable-station.service.ts` の `fetchTrips`）。
- #15 は v2 service の `findManyBySpecificDate` のロジックを v3 query に `createQueryBuilder` で再実装する（v2 実装が仕様。`formation.v2.controller.ts` の `@Get('as/of/:date')` から辿れる）。
- `serviceName` パラメータ（#2, #12, #14）は client が定数文字列で filter していたものの置き換え。値の解釈は完全一致のみ。

#### 4-C. trip-block コマンドの実装方針（#8〜#11）

ビジネスロジックは既に `src/libs/trip-block/usecase/trip-block.v2.service.ts` と domain 層（`TripBlockDomainBuilder` 等）に分離済みで、`CrudRequest` は**応答整形（joins 付き再取得）にしか使われていない**。したがって:

1. v3 用に `TripBlockV3Service` を新設し、`createManyTripBlocks` / `replaceOneTripBlock` / `addTripToTripBlock` / `deleteTripFromTripBlock` の各フローを v2 service から**移植**する。domain 層・`TripBlockCommand`・各 DTO はそのまま再利用する（変更禁止）。
2. v2 service が `this.tripBlockQuery.findOneTripBlock(query /* CrudRequest */)` で行っている応答整形は、新設する `createQueryBuilder` ベースのクエリメソッド（#7 の固定 join）に置き換える。
3. v2 service・v2 controller は触らない（CLI モジュールが v2 service に依存している）。

#### 4-D. 実装手順と検証

1. 1 ドメイン = 1 ブランチ単位。**usecase 層の spec を先に書いてから**実装する（参照: `operation-sighting.v3.service.spec.ts` のスタイル）。
2. 各エンドポイント完了ごとに `npm test` 全緑 + `npm run build` 成功を確認。
3. docker-compose の Postgres を起動し、supertest または手動リクエストで**v2 と v3 のレスポンス JSON を並べて比較**し、差分がないこと（または上表で意図した superset であること）を報告書に貼る。
4. 全エンドポイント完了後、client 側の移行作業（client リポジトリの refactor-instructions.md Phase 5）が可能になる旨を報告する。

### Phase 5: 提案書の作成（実装しない）
以下を報告書の「提案」セクションにまとめる。実装はしない。
- v2 API 廃止のロードマップ（client の移行デプロイ完了をどう確認するかを含む）
- tsconfig strict 化の段階的導入案
- TypeScript / 依存パッケージ更新の影響調査結果

## Verification Requirements

- 各フェーズの最後に `npm test` と `npm run build` を実行し、結果を記録する。
- lint は `npx eslint "{src,test}/**/*.ts"`（--fix なし）で確認する。
- ファイル移動を伴う変更（Phase 3）は、`npm run build` の成功と `git diff --stat` の確認をもって完了とする。
- 「動くはず」での完了宣言は禁止。コマンド出力を貼ること。

## Reporting Format

作業完了時に以下を報告する。

```
## 実施内容
- フェーズごとの変更概要とコミット一覧

## 検証結果
- 実行したコマンドとその出力（ベースラインとの差分を明記）

## 未実施・提案事項
- Phase 4 の提案内容
- 途中で発見した疑義（挙動が怪しい箇所、テストと実装の矛盾など）

## 質問
- Stop And Ask に該当して停止した項目
```

## Out-of-scope Items

- v2 エンドポイントの**削除・変更**（v3 新設は Phase 4 のスコープだが、v2 自体は client 移行のデプロイ完了まで温存する）
- `db/backup/`・`db/oldSeedMigration/`・`db/oldTableMigration/`・`db/seeds/` の削除（歴史的記録として保持。ユーザー決定済み）
- エンティティ・DB スキーマ・migration の変更
- 依存パッケージのバージョン更新、patch-package の変更
- `serverless.ts` / デプロイ設定の変更
- tsconfig の strict 化
- 認証・RBAC ロジックの変更
- 他リポジトリ(client / backend / socket / auth / infrastructure)への変更

## Cross-repo Dependencies（他リポジトリとの関係）

- **sotetsu-lab-v3-client**: 本 API の利用者。client の `src/app/libs/` 12 ファイルが v2 エンドポイントに依存。**作業順序: ①本リポジトリ Phase 4 で v3 新設 → ②client 側で v2→v3 移行（client の指示書 Phase 5） → ③移行デプロイ完了後に v2 削除（将来の別タスク）**。
- **sotetsu-lab-v3-backend**: Cognito の client_credentials でトークンを発行し、client がそれを本 API に渡す。認証ヘッダー仕様・scope 名（`sotetsu-lab-v3-api/<role>`）を変えると backend / client が壊れる。
