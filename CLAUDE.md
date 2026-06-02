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

- **operation-sighting** - 列車編成の目撃情報管理（v2・v3 API がある）
- **operation** - 運行番号・運用番号管理
- **formation** - 編成（列車セット）情報
- **calendar** - 運行日定義
- **route/station/service** - 路線・駅・サービス
- **trip/trip-block/trip-class** - 列車・トリップ管理
- **agency/vehicle** - 事業者・車両

### 命名規約

- API バージョニング: コントローラー・モジュールにバージョン付与（`operation-sighting.v2.module.ts` など）
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
npm run cli -- rebuildLatestCache   # operation_sighting_latest_caches を全件再構築する
```

### デプロイ
```bash
npm run build
npm run start:prod           # 本番ビルド起動
npm run deploy               # Serverless Framework でデプロイ
```

## 主要な技術スタック

- **フレームワーク** - NestJS 10.x / TypeScript 4.7
- **DB** - TypeORM 0.3 + PostgreSQL
- **API ドキュメント** - Swagger
- **バリデーション** - class-validator（DTO ベース）
- **ログ** - Pino（JSON 形式）
- **認証** - AWS JWT Verify
- **セキュリティ** - Helmet
- **日時処理** - dayjs（タイムゾーン対応）
- **テスト** - Jest + ts-jest + Supertest
- **コード品質** - ESLint + Prettier
- **デプロイ** - Serverless Framework

## 開発上の注意点

### 環境設定
- `.env.local` で設定（dotenvx で読み込み）
- タイムゾーン - 全体で Asia/Tokyo に統一
- CORS - `CORS_HEADER_ORIGIN` で設定（デフォルト `*`）

### エラーハンドリング
- ドメイン層のエラーは `UseCaseError` を使用
- グローバル `UseCaseErrorFilter` が HTTP レスポンスに変換
- エラーコンテキスト付きで返却される
- データ不整合（null 不可フィールドが null になるなど）は `UnexpectedError` を throw → `UnexpectedErrorFilter` が HTTP 500 を返す

### DB アクセスパターン
- Query（読み取り）→ `.query.ts` → DTO を返却
- Command（書き込み）→ `.command.ts` → ドメインエンティティで操作
- TypeORM data-source → `src/core/utils/data-source.ts`
- マイグレーション実行時は dotenvx で `.env.local` を読み込む

### テスト戦略
- ユニットテスト - ソースコードと同じ場所（`.spec.ts`）
- Jest 設定 - `src/` をルートで `.spec.ts$` マッチ
- E2E テスト - `test/` フォルダ（別の Jest 設定）
- カバレッジ - `coverage/`（gitignore 対象）

### Git・コミット
- Conventional Commits 形式（`:sparkles:` など絵文字を description 前に記載）
- 複数コミット時 - 機能コミット + 別途 docs/ADR コミットに分割
- マイグレーション - スキーマ変更は git トラッキングで管理
