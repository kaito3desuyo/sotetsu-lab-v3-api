# v2 廃止と @dataui/crud 撤去 設計

- 日付: 2026-10-20
- 対象: sotetsu-lab-v3-api のみ
- 後続: NestJS 12 化（別 spec）。本件はその前提として、更新の止まった `@dataui/crud` を依存から外す

## 1. 目的

- api の v2（`/v2/*`）を廃止する
- `@dataui/crud`・`@dataui/crud-request`・`@dataui/crud-typeorm` を依存から外す
- v3 の振る舞い（URL・応答の中身・Cache-Control・認証）は 1 つも変えない

## 2. 背景と根拠

- `@dataui/crud` は 5.3.4（2024-04）で更新が止まり、NestJS 11 / 12 での動作は保証されない。NestJS を上げる前に外しておく
- v2 を使っている所が無い
  - client・backend・socket のどのリポも `/v2/` を呼んでいない（2026-10-20 に grep で確認）
  - 本番 api の Lambda ログ 30 日分で、`/v2/` は確認用の curl 7 件だけ（2026-10-20 に Logs Insights で確認）
  - 2026-10-20 の Supabase Auth 切り替え以降、v2 は Supabase のトークンが無いと 401 を返す。そのトークンを取れるのは v3 の client だけなので、外部の利用者がいたとしても既に使えない
- v3 は `@dataui/crud` の検索（`CrudRequest`）を使っていない。`TypeOrmCrudService` を継承しているだけで、継承から使っているのは v2 用のメソッドだけ。v3 の query・command はどれも `@InjectRepository` で Repository を自分で持っている

## 3. 消すもの

### 3.1 v2 の口

- `src/routes/api/v2/`（`ApiV2Module`）と、`src/routes/api-routing.module.ts` の `ApiV2Module` の登録
- 次の 12 ドメインの `*.v2.module.ts`・`presentation/*.v2.controller.ts`・`usecase/*.v2.service.ts` と、その spec
  - agency・service・calendar・route・formation・vehicle・operation・operation-sighting・station・trip・trip-class・trip-block
- 上を消した結果、どこからも使われなくなる DTO・param・builder・query・module。判定は「import するファイルが 0 件」（`tsc` が通ること＋ grep で確かめる）
  - 例: `VehicleQuery` は v2 からしか使われていない。`vehicle.libs.module.ts` がほかから import されていなければ一緒に消す。`VehicleModel` は formation の関連で使われるので残す
- `src/core/utils/pagination-header.ts`（v2 からしか使われていない）
- `src/core/utils/merge-customizer.ts`（v2 と、3.2 で消す `CrudRequest` 用メソッドからしか使われていない）

### 3.2 @dataui/crud

- query 12 個・command 2 個から `extends TypeOrmCrudService<…>` と `super(…)` を外す
  - query: agency・service・calendar・route・formation・vehicle（3.1 で消えなければ）・operation・operation-sighting・station・trip・trip-class・trip-block
  - command: operation-sighting・trip-block
- `CrudRequest` を受けるメソッドを消す（呼び出し元は全部 v2）
  - `findMany…(query: CrudRequest)`・`findOne…(query: CrudRequest)` の各 query のもの
  - `FormationQuery.findManyFormations`（`createBuilder` を使う）
  - `OperationSightingQuery.findManyOperationSightings`・`findManyLatestOperationSightingsGroupByOperation`・`findManyLatestOperationSightingsGroupByFormation`・`findOneOperationSighting`
  - `OperationSightingCommand.createOneOperationSighting`
  - `TripBlockCommand.createManyTripBlocks`・`replaceOneTripBlock`・`deleteOneTripBlock`（v3 は `bulkCreate`・`replaceOneTripBlockByDomain`・`deleteOneTripBlockByDomain` を使う）
- どこからも呼ばれていない `OperationSightingQuery` の 4 メソッド（`this.findOne` を使う）を消す
  - `findOneLatestOperationSightingFromOperationNumber`
  - `findOneLatestOperationSightingFromOperationNumberAndSightingTimeRange`
  - `findOneLatestOperationSightingFromFormationNumber`
  - `findOneLatestOperationSightingFromFormationNumberAndSightingTimeRange`
- `package.json` から `@dataui/crud`・`@dataui/crud-request`・`@dataui/crud-typeorm` を外し、`package-lock.json` を更新する
- spec のリポジトリモックにある、`TypeOrmCrudService` のコンストラクタ用のダミー `metadata`（`connection.options.type` など）を外す
- CLAUDE.md の `TypeOrmCrudService` に関する注意書きと、v2 に触れる記述を今の形に直す

## 4. 変えないもの

- v3 の controller・service・query のロジック（継承を外す以外に手を入れない）
- v3 の URL・応答・Cache-Control・認証（AuthGuard・RBACGuard）
- DB のスキーマ（マイグレーションは作らない）
- serverless.ts・インフラ（v2 専用の設定は無い）

## 5. 確かめ方

1. `npm run build`・`npx tsc --noEmit`・jest 全件・lint が通る
2. 手元の api（本番 DB を読む）で次を叩き、本番と同じ結果になる
   - v3 の一覧: agencies・routes・stations・services・calendars・trip-classes・formations・operations・operation-sightings・trip-blocks（`fields` 付きも）
   - v3 の詳細: 各 `/:id` の代表 1 件
   - trip-blocks の書き込み: 渋谷工事臨時ダイヤ（2021 年 10 月版）で登録・更新・削除し、後始末の SQL で戻す
   - 目撃の投稿（POST）の口が生きていること。本番 DB に目撃を残さないため、検証で 400 になる body を送り、404・500 にならないことを見る
   - CLI（`npm run cli`）が DI のエラー無しに起動すること
3. `/v2/agencies` が 404 を返す
4. 本番デプロイ後、v3 の確認スクリプト（トークン無し 401・匿名 200・health-check 200）と、client の主な画面が表示されることを見る

## 6. デプロイと版

- api だけ。client・backend・socket は触らない
- 版は major（v4.0.0）。v2 の口が消えるのは後方互換の無い変更のため（v2 を消すコミットは `refactor!` と BREAKING CHANGE）

## 7. ドキュメント

- ADR を 1 本足す（`docs/adr/0006-remove-v2-and-dataui-crud.md`）。v2 を消した理由と根拠（2 章）、`@dataui/crud` を捨てて Repository＋`createQueryBuilder` に寄せること
- `docs/refactor-instructions.md` など v2 に触れる文書は、廃止済みと分かるように直す
