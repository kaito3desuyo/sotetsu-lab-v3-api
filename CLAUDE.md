# CLAUDE.md

このファイルは Claude Code (claude.ai/code) がこのリポジトリで作業するための指針を提供します。

## プロジェクト概要

相鉄線の運行情報・編成目撃情報を管理する NestJS ベースの API。TypeScript + TypeORM（PostgreSQL）を使用し、クリーンアーキテクチャのレイヤード構造で複数のドメインモジュールで構成されています。

## アーキテクチャ

### ドメインモジュールの構造（`src/libs/`）

各ドメイン配下は以下のレイヤーに分かれています：

- **domain/** - 純粋なビジネスロジック、エンティティ、ドメインルール
- **infrastructure/** - データ永続化（TypeORM の Query/Command リポジトリ）、外部サービス連携
- **presentation/** - HTTP コントローラー、DTO、API レスポンス
- **usecase/** - アプリケーションロジック層；ドメイン・インフラを組み合わせたビジネスワークフロー

### コア機能（`src/core/`）

- **classes/** - カスタム例外クラス（`UseCaseError` はドメイン層のエラー用）
- **configs/** - 設定定数（バリデーター設定など）
- **filters/** - NestJS グローバルフィルター（`UseCaseErrorFilter` がドメインエラーを HTTP レスポンスに変換）
- **modules/** - 共有モジュール（Logger、Auth など）
- **types/** - 共有 TypeScript 型定義
- **utils/** - ユーティリティ関数（datetime ヘルパー、TypeORM data-source など）

### 主要なドメイン

- **operation-sighting** - 列車編成の目撃情報管理
- **operation** - 運行番号・運用番号管理
- **formation** - 編成（列車セット）情報
- **calendar** - 運行日定義
- **route/station/service** - 路線・駅・サービス
- **trip/trip-block/trip-class** - 列車・トリップ管理
- **agency/vehicle** - 事業者・車両

### 命名規約

- API バージョニング: コントローラー・モジュールにバージョン付与（`operation-sighting.v3.module.ts` など。v2 は廃止済み・ADR-0006）
- サービス分離: `.service.ts`（ビジネスロジック）、`.query.ts`（読み取り）、`.command.ts`（書き込み）

## よく使うコマンド

### インストール・ビルド
```bash
npm install
npm run build                # dist/ に出力
```

### 開発
```bash
npm run start:dev            # ホットリロード対応
npm run start:debug          # デバッグ（inspector）
npm run format               # Prettier でフォーマット
npm run lint                 # ESLint（自動修正）
```

### テスト
```bash
npm run test                 # ユニットテスト実行
npm run test:watch           # ウォッチモード
npm run test:cov             # カバレッジ出力
npm run test:debug           # デバッグ実行
npm run test:e2e             # E2E テスト

# 単一モジュールのテスト
npm run test -- operation-sighting.v3.service
npm run test:watch -- operation-sighting.v3.service --verbose
```

### DB マイグレーション
```bash
npm run migration:generate   # エンティティから自動生成
npm run migration:create     # マイグレーション作成
npm run migration:run        # 実行
npm run migration:revert     # ロールバック
```

### CLI
```bash
npm run cli -- operation-sighting rebuild-latest-cache   # operation_sighting_latest_caches を全件再構築する
```

### デプロイ
```bash
npm run build
npm run start:prod           # 本番ビルド起動
npm run deploy               # Serverless Framework でデプロイ
```

## 主要な技術スタック

- **フレームワーク** - NestJS 12.x / TypeScript 6.0
- **DB** - TypeORM 1.x + PostgreSQL
- **バリデーション** - class-validator（DTO ベース）
- **ログ** - Pino（JSON 形式）
- **認証** - Supabase Auth の JWT を jose で検証（AuthGuard・RBACGuard）
- **セキュリティ** - Helmet
- **日時処理** - dayjs（タイムゾーン対応）
- **テスト** - Vitest + unplugin-swc + Supertest
- **コード品質** - ESLint + Prettier
- **デプロイ** - Serverless Framework

## 開発上の注意点

### 環境設定
- `.env.local` で設定（dotenvx で読み込み）
- タイムゾーン - 全体で Asia/Tokyo に統一
- CORS - `CORS_HEADER_ORIGIN` で設定（デフォルト `*`）
- socket への合図 - `SOCKET_BROADCAST_FUNCTION_NAME` が空なら送らない。手元で socket の serverless-offline（`npm run dev:host`）に送るときは `.env.local` に `SOCKET_BROADCAST_FUNCTION_NAME=sotetsu-lab-v3-dev-socket-broadcast-lambda` と `SOCKET_BROADCAST_LAMBDA_ENDPOINT=http://host.docker.internal:3022` を書き、コンテナを作り直す（手順は socket の README）
- CDN の失効 - `CDN_DISTRIBUTION_ID`（`serverless.ts` が client のスタックの `WebDistributionId` から入れる）が空なら呼ばない。書き込みの usecase は、`socketSignal.send` の隣で `cdnInvalidation.invalidate({ tags })` を呼び、client が画面に付けたタグ（`calendar:<id>`・過ぎた日の `sighting-date:<日付>`）を捨てる。失敗しても書き込みは成功のまま返す。新しい書き込みの入口を足したら、捨てるタグも決める（ADR-0012）
- TypeScript は strict。値を外から詰めるプロパティ（エンティティ・DTO）は `!`。`as any`・`@ts-ignore` は使わない

### ESM
- `"type": "module"`。相対 import には `.js` を付ける（`import { X } from './x.js'`）。`src/…` の絶対 import は使えない
- CommonJS のパッケージからの名前付き import は実行時に落ちることがある。default import にする。lodash は使わない（標準の関数を使い、足りなければ es-toolkit・ADR-0008）
- エンティティの関連の型は `Relation<…>`、DTO の入れ子は `Nested<…>` で包む（循環 import 対策）。どちらも `import type` で読む（SWC がメタデータで値として参照するため）
- エンティティは glob でなく `src/core/configs/entities.ts` の一覧で TypeORM に渡す。モデルを足したら一覧にも足す（`entities.spec.ts` が漏れを見つける）
- `package.json` の `overrides`（`@golevelup/nestjs-discovery` 7.1.0）は nest-commander が Nest 12 対応版を取ったら外す（ADR-0007）
- CLI・migration・seed は `@swc-node/register/esm-register` で TS のまま流す
- Lambda では `dist/run.sh` が `register-node-path.js` を先に読み、レイヤー（NODE_PATH）の依存を ESM でも解決する。外すと本番が起動しない
- Express 5 のクエリ解析は `extended` に戻してある（`fields[資源]=項目` のため）
- serverless-layers は 2.7.0 に固定（2.8.5 は package で手元の dev 依存を消す・ADR-0007）

### エラーハンドリング
- ドメイン層のエラーは `UseCaseError` を使用
- グローバル `UseCaseErrorFilter` が HTTP レスポンスに変換
- エラーコンテキスト付きで返却される
- データ不整合（null 不可フィールドが null になるなど）は `UnexpectedError` を throw → `UnexpectedErrorFilter` が HTTP 500 を返す

### DB アクセスパターン
- Query（読み取り）→ `.query.ts` → DTO を返却
- Query の実装は TypeORM の `createQueryBuilder` で書く。`repository.find` / `findOne`（`relations` 付き）は新たに使わない。`findOne` に `relations` を付けると、`DISTINCT` の問い合わせが余分に 1 本走る
- Command（書き込み）→ `.command.ts` → ドメインエンティティで操作
- TypeORM data-source → `src/core/utils/data-source.ts`
- マイグレーション実行時は dotenvx で `.env.local` を読み込む
- anti-join は `LEFT JOIN IS NULL` でなく `NOT EXISTS (subQuery)` を使う（sighting_time インデックスと組み合わせることで大幅高速化）

### テスト戦略
- ユニットテスト - ソースコードと同じ場所（`.spec.ts`）
- Vitest 設定 - `vitest.config.ts`（`src/**/*.spec.ts`）。e2e は `vitest.config.e2e.ts`
- E2E テスト - `test/` フォルダ（DB に繋ぐので `npm run dotenv -- npm run test:e2e`）
- テスト・CLI・migration は SWC を使うので、Claude Code のサンドボックス内では動かない（`ERR_SWC_NATIVE_CACHE`）。サンドボックス外で流す
- カバレッジ - `coverage/`（gitignore 対象）
- usecase 層のモックテストは Query の `relations` 漏れを検知できない — リレーションを追加・参照する際は Query クラス自体の spec も書く

### Git・コミット
- Conventional Commits 形式（`:sparkles:` など絵文字を description 前に記載）
- 複数コミット時 - 機能コミット + 別途 docs/ADR コミットに分割
- マイグレーション - スキーマ変更は git トラッキングで管理
- コミットメッセージ中のドメイン名は日本語で書く（例: operation-sighting → 目撃情報、formation → 編成、operation → 運用）
