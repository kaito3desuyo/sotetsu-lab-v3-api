# Suggested Commands

## Development
```bash
npm run start:dev          # ホットリロード開発サーバー
npm run start:debug        # デバッグモード（inspector）
npm run format             # Prettier フォーマット
npm run lint               # ESLint（自動修正）
```

## Build & Production
```bash
npm run build              # dist/ へビルド
npm run start:prod         # 本番ビルド起動
npm run deploy             # Serverless Framework デプロイ
```

## Testing
```bash
npm run test               # ユニットテスト
npm run test:watch         # ウォッチモード
npm run test:cov           # カバレッジ
npm run test:e2e           # E2E テスト
# 特定モジュールのみ
npm run test -- operation-sighting.v3.service
npm run test:watch -- operation-sighting.v3.service --verbose
```

## Database Migration
```bash
npm run migration:generate # エンティティから自動生成
npm run migration:create   # 空マイグレーション作成
npm run migration:run      # 実行
npm run migration:revert   # ロールバック
```

## CLI
```bash
npm run cli -- rebuildLatestCache   # operation_sighting_latest_caches を全件再構築
```

## Environment
- `.env.local` で設定（dotenvx 読み込み）
- マイグレーション実行時は dotenvx が自動的に `.env.local` を読み込む
