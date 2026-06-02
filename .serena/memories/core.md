# Project Core

## Overview
相鉄線（Sotetsu Line）の運行情報・編成目撃情報を管理する NestJS ベースの REST API。
- 列車編成の目撃情報（operation-sighting）登録・閲覧
- 運行番号・運用番号管理（operation）
- 編成情報（formation）、路線・駅・サービス管理

## Architecture
Clean architecture の Layered structure:
- `src/libs/<domain>/domain/` - ビジネスロジック、エンティティ、ドメインルール
- `src/libs/<domain>/infrastructure/` - TypeORM リポジトリ（`.query.ts` = 読み取り、`.command.ts` = 書き込み）
- `src/libs/<domain>/presentation/` - HTTP コントローラー、DTO
- `src/libs/<domain>/usecase/` - アプリケーションロジック、ドメイン・インフラの組み合わせ

## Domain Modules (`src/libs/`)
- **operation-sighting** - 列車編成目撃情報（v2・v3 API あり）
- **operation** - 運行番号・運用番号
- **formation** - 編成（列車セット）
- **calendar** - 運行日定義
- **route / station / service** - 路線・駅・サービス
- **trip / trip-block / trip-class** - 列車・トリップ
- **agency / vehicle** - 事業者・車両

## Core Infrastructure (`src/core/`)
- `classes/` - カスタム例外（`UseCaseError`, `UnexpectedError`）
- `filters/` - `UseCaseErrorFilter`（ドメインエラー → HTTP レスポンス変換）
- `modules/` - 共有モジュール（Logger, Auth）
- `utils/` - datetime ヘルパー、TypeORM data-source

## Entry Points
- `src/main.ts` - HTTP サーバー起動
- `src/cli.ts` - CLI コマンド（nest-commander）
- `src/app.module.ts` - ルートモジュール
