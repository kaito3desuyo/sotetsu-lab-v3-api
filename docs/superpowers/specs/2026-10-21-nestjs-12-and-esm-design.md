# NestJS 12 化と ESM 化 設計

- 日付: 2026-10-21
- 対象: sotetsu-lab-v3-api のみ
- 前提: v2 と `@dataui/crud` は撤去済み（ADR-0006・v4.0.0）
- 後続（別 spec）: typeorm 1.x 化。socket の osls 4 化

## 1. 目的

- NestJS を 10 から 12 に上げる。引きずられて上がる TypeScript・Jest・nestjs-pino なども上げる
- NestJS に引きずられない依存も、この機会に最新に上げる（typeorm を除く）
- アプリを CommonJS から ESM に切り替える
- 壊れている CLI（`npm run cli`）を直す
- v3 の振る舞い（URL・応答の中身・Cache-Control・認証）は変えない。helmet が付けるヘッダーだけは helmet 8 の既定に従う（5 章）

## 2. 背景と根拠

- NestJS 10 はサポートが切れている。12 は ESM のパッケージだけを出し、CommonJS からは Node の `require(esm)` で読む（Node 20.19 以上・22.12 以上。手元・CI・Lambda はどれも Node 24）
- TypeScript は 6.x にする。`@nestjs/schematics` 12 が 6 以上を、ts-jest 29.4 が 7 未満を求めるため。TS 6 では今の tsconfig の `baseUrl`・`moduleResolution`（既定の node10）・`rootDir` の推論が非推奨か挙動変更になる。`rootDir` を明示しないと出力が `dist/src/main.js` に変わり、Lambda（`dist/run.sh` → `node dist/main.js`）が起動しなくなる
- ESM は「拡張子付きの import（`.js`）」で書く。バンドル（rspack）で `.js` を避ける案も比べたが採らない
  - 速さの差が無い。2026-10-21 に手元で `AppModule` の require を 15 回ずつ測ると、アプリ全体 431 ms・依存だけ 438 ms（中央値）で、自前のコードの読み込みはぶれに埋もれる。起動のほぼ全部は node_modules の読み込み
  - バンドルにすると rspack の設定・エンティティの一覧化・migration と seed の流し方の作り直しが増える。tsc のままなら仕組みが今と同じ。NestJS 12 の ESM 雛形もこの形
- `@nestjs/swagger` はどこからも import されていないので、上げずに外す

## 3. 段 1 — CommonJS のまま上げる

### 3.1 依存

- NestJS 12 系: `@nestjs/common`・`core`・`platform-express`・`testing`・`cli`・`schematics` を 12、`@nestjs/typeorm` を 12
- `@nestjs/swagger` を外す
- TypeScript 6.x（7 にはしない）
- Jest 30・`@types/jest` 30・ts-jest 29.4（段 2 で Vitest に替える）
- nestjs-pino 5・pino-http 11・pino 10（peer）・pino-pretty 13
- nest-commander 3.21
- helmet 8・class-validator 0.15・reflect-metadata 0.2・uuid 14・`@dotenvx/dotenvx` 2・tsconfig-paths 4（段 2 で不要になれば外す）
- eslint 10（設定を `.eslintrc.json` から flat config の `eslint.config.mjs` に書き換える）・eslint-config-prettier 10・typescript-eslint 8 系の最新
- osls 4。プラグイン（serverless-layers・serverless-deployment-bucket・serverless-plugin-warmup）が osls 4（AWS SDK v3）で動くかを確かめる。動かないものは代わりを探すか、osls を 3 に留めて別 spec に回す
- `@types/node` は 24 系（実行環境の Node 24 に合わせる。26 にはしない）
- 上のほかは同じメジャーの中の最新（pg・jose・lodash・prettier・supertest・rimraf・serverless-layers・serverless-plugin-warmup・`@serverless/typescript`・各 `@types/*`）。`patches/@serverless+typescript+4.27.1.patch` は新しい版で要るかを見て、要るなら作り直し、要らなければ消す
- typeorm は 0.3 のまま

### 3.2 コード・設定

- tsconfig
  - `module`・`moduleResolution` を `nodenext`、`target` を `ES2023`
  - `baseUrl` をやめ、`paths` に `"src/*": ["./src/*"]` を書く（`src/…` の import はそのまま使える）
  - `types` を明示する（`["node", "jest"]`）
  - `tsconfig.build.json` に `rootDir: "./src"` を書き、出力を今と同じ `dist/main.js` に保つ
- Express 5: `CacheControlModule` の `forRoutes('*')` を `forRoutes('{*splat}')` にする
- Express 5 の既定のクエリ解析（`simple`）で v3 の応答が変わらないことを 6 章の突き合わせで確かめる。変わるなら `app.set('query parser', 'extended')` で今の挙動に戻す
- NestJS 11・12 の移行ガイドの「自動で移せない変更」（ライフサイクルフックの順・パイプの型・ログの params）を当てはめ、当たる所だけ直す
- CLAUDE.md の技術スタック（NestJS・TypeScript の版、Swagger の行）を直す

## 4. 段 2 — ESM に切り替える

- `package.json` に `"type": "module"` を足す
- 相対 import に `.js` を付ける（約 300 ファイル。スクリプトで置き換える）
- `src/…` の import は相対パス（`.js` 付き）に書き換え、tsconfig の `paths` と tsconfig-paths をやめる。ESM の Node は `src/…` を解決できず、tsc も書き換えないため
- TypeORM のエンティティ 23 個で、関連のプロパティの型を `Relation<…>` で包む。ESM では循環 import とデコレータのメタデータが重なると起動時に初期化前参照で落ちるため（TypeORM が勧める回避策）
- `__dirname`（`src/core/configs/database.config.ts`・seed・spec の 4 か所）を `import.meta.dirname` にする
- テストを Jest から Vitest＋SWC（`unplugin-swc`。デコレータのメタデータを出すため）に替える。`jest.fn` などを `vi.*` に書き換える（18 ファイル）。e2e（`test/`）も Vitest に寄せる。Jest・ts-jest・`@types/jest` を外す
- ts-node を外す
  - CLI（`npm run cli`）と migration（`migration:*`）は、ビルドした `dist` から流す
  - seed（`db/seeds/*`）は SWC の ESM loader（`@swc-node/register`）で流す
  - これで今の CLI の壊れ（`src/cli.ts` の `express.d` の import で ts-node が落ちる）も解消する。型だけの `express.d.ts` は値として import せず、tsconfig から読ませる
- `typeorm-ts-node-commonjs` を使う npm script を、上の流し方に合わせて書き換える
- CI（`.github/workflows/ci.yml`）の `npm test` が Vitest を流すようにする
- `src/run.sh`（`node dist/main.js`）と serverless.ts の handler は変えない。`dist` に `package.json` の `"type": "module"` が効くよう、デプロイ物に `package.json` が入っていることを確かめる

## 5. 変えないもの・変わってよいもの

- 変えない: v3 の URL・応答の中身・Cache-Control・認証（AuthGuard・RBACGuard）・DB のスキーマ（マイグレーションは作らない）・Lambda の構成（handler・レイヤー・環境変数）
- 変わってよい: helmet 5 → 8 で既定が変わったヘッダー（`Cross-Origin-Embedder-Policy` など）。変わったヘッダーは PR に一覧で書き、client（v3.sotetsu-lab.com）からの取得が壊れないことを確かめる
- 変わってよい: pino のログ行の細かい形（ログを読む仕組みは CloudWatch で人が見るだけ）

## 6. 確かめ方

段 1 の終わりと段 2 の終わりで、それぞれ次を全部通す。

1. `npm run build`・`npx tsc --noEmit`・テスト全件（段 1 は Jest、段 2 は Vitest）・lint が通る
2. lint の指摘が、eslint 10 に替える前と同じ規則で同じ件数（設定の書き換えで規則が抜けていない）
3. 手元の api（本番 DB を読む）で、本番ログの v3 の GET 65 本（`.context/v3_get_urls.sh`）を流し、本番の応答と JSON で突き合わせて全部一致（`.context/compare_local_prod.py`）
4. trip-blocks の書き込み（登録・更新・削除）を渋谷工事臨時ダイヤ（2021 年 10 月版）で行い、後始末の SQL で戻す
5. 目撃の投稿（POST）に検証で落ちる body を送り、422 が返る（404・500 にならない）
6. CLI（`npm run cli -- rebuildLatestCache` の起動まで。DI のエラーが出ない）・`migration:generate`（差分なしと出る）・seed の 1 本（`--help` 相当か、空振りで終わる形）が動く
7. `dist/main.js` で起動し、`/health-check` が 200
8. 起動時間を測り直し、段 0（今）と比べて大きく遅くなっていない（`.context/measure_load.sh`）
9. `serverless package` が通り、デプロイ物に `dist`・`package.json` が入っている

デプロイ後に、v3 の確認スクリプト（トークン無し 401・匿名 200・health-check 200）・client の主な画面・Lambda の Init Duration（前後で比べる）を見る。

## 7. 出し方と版

- api だけ。client・backend・socket は触らない
- 1 本の PR。段 1 と段 2 でコミットを分ける。段 2 が行き詰まったら、段 1 までで PR を出す
- 版は major（v5.0.0）。NestJS 12・ESM 化で依存と出力の形が変わり、helmet のヘッダーも変わるため。コミットには `!` と BREAKING CHANGE を付ける

## 8. ドキュメント

- ADR を 1 本足す（`docs/adr/0007-nestjs-12-and-esm.md`）。NestJS 12 と ESM にした理由、`.js` 付き import を選びバンドルを退けた根拠（2 章の計測）、Jest から Vitest への切り替え、ts-node を外した流し方
- CLAUDE.md のコマンド（テスト・CLI・migration）と技術スタックを今の形に直す
