# Tech Stack

## Runtime & Framework
- **Node.js** + **TypeScript 4.7**
- **NestJS 10.x** - フレームワーク（DI、モジュール、コントローラー、Guards）
- **nest-commander** - CLI コマンド

## Database
- **PostgreSQL** + **TypeORM 0.3**
- マイグレーション管理: `npm run migration:generate / run / revert`
- Data source: `src/core/utils/data-source.ts`

## Key Libraries
- **dayjs** - 日時処理（Asia/Tokyo タイムゾーン統一）
- **pino** - JSON 形式ログ
- **class-validator** - DTO バリデーション
- **helmet** - セキュリティヘッダー
- **aws-jwt-verify** - JWT 認証（AWS）
- **dotenvx** - `.env.local` ロード

## Dev Tools
- **Jest + ts-jest** - ユニットテスト（`.spec.ts` をソースと同フォルダ）
- **Supertest** - E2E テスト（`test/` フォルダ）
- **ESLint + Prettier** - コード品質
- **Swagger** - API ドキュメント自動生成

## Infrastructure
- **Serverless Framework** - デプロイ（`npm run deploy`）
- **Docker** - `Dockerfile`, `docker-compose.prod.yml`
- **AWS CodeDeploy** - `appspec.yaml`, `buildspec.yml`
