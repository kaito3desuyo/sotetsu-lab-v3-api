# Conventions

## Naming
- **API バージョニング**: コントローラー・モジュールにバージョン付与（例: `operation-sighting.v2.module.ts`）
- **サービス分離**: `.service.ts`（ビジネスロジック）、`.query.ts`（読み取り）、`.command.ts`（書き込み）
- **DTO**: `presentation/` 配下に格納

## Error Handling
- ドメイン層エラーは `UseCaseError` を使用（`src/core/classes/`）
- `UseCaseErrorFilter` が HTTP レスポンスに変換（グローバルフィルター）
- データ不整合（null 不可フィールドが null になる等）は `UnexpectedError` → `UnexpectedErrorFilter` が HTTP 500 を返す

## DB Access Patterns
- 読み取り: `.query.ts` → DTO を返却
- 書き込み: `.command.ts` → ドメインエンティティで操作
- TypeORM data-source: `src/core/utils/data-source.ts`

## Git / Commit
- Conventional Commits 形式: `feat: :sparkles: 新機能を追加する`
- 絵文字はテキスト形式（`:sparkles:` 等）で description の直前
- description は体言止めにしない（「追加する」「修正する」の形）
- ADR 伴う作業は「機能コミット + docs コミット」の2分割

## Code Style
- タイムゾーン: Asia/Tokyo 統一（dayjs で処理）
- CORS: `CORS_HEADER_ORIGIN` 環境変数で設定
- Swagger でAPI自動ドキュメント生成
