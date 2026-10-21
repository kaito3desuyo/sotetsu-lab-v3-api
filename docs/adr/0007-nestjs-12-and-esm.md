# ADR-0007: NestJS 12 に上げ ESM に切り替える

- **日時**: 2026-10-21
- **Agent**: claude-opus-5-5
- **ステータス**: 採用済み
- **ブランチ**: build/nestjs-12
- **spec**: docs/superpowers/specs/2026-10-21-nestjs-12-and-esm-design.md

---

## 背景

- NestJS 10 はサポートが切れていた。12 は ESM のパッケージだけを出す（CommonJS からは Node の `require(esm)` で読める）。
- TypeScript 6 で、今の tsconfig の `baseUrl`・`moduleResolution`（node10）・`rootDir` の推論が非推奨か挙動変更になった。

## 決定

- NestJS 12・TypeScript 6.0 に上げ、NestJS に引きずられない依存も最新にする（typeorm 0.3 は据え置き）。
- アプリを ESM（`"type": "module"`）に切り替え、import は `.js` 付きで書く。`src/…` の絶対 import はやめて相対パスにする。
- テストは Jest から Vitest＋unplugin-swc に替える。
- ts-node をやめ、CLI・migration・seed は `@swc-node/register` の ESM loader で流す。
- デプロイ物は `dist/**` だけなので、build のあとに `dist/package.json`（`{"type":"module"}`）を書く。
- TS 6 で既定が変わった `strict`・`useDefineForClassFields` は `false` を明示して今の挙動を保つ。

## 根拠

- `.js` を避けるため rspack でバンドルする案を比べた。2026-10-21 に手元で `AppModule` の require を 15 回ずつ測ると、アプリ全体 431 ms・依存だけ 438 ms（中央値）で、自前のコードをまとめても起動は速くならない。仕組みが増えるだけなので採らない。
- Jest の ESM 対応は試験段階。NestJS 12 の ESM 雛形は Vitest を使う。
- 循環 import とデコレータのメタデータ（`design:type`）が重なると、SWC・ESM では初期化前参照で落ちる。エンティティの関連は TypeORM の `Relation<>`、DTO 同士の入れ子は同じ仕組みの `Nested<>`（`src/core/types/nested.ts`）で包む。
- SWC はメタデータで型の名前を値として参照するので、`Relation`・`Nested` は `import type` で読む（名前付きで読むと ESM の読み込みで「export が無い」で落ちる）。

## 却下した案

- バンドル（rspack）で `.js` を避ける（上の計測）。
- `ignoreDeprecations: "6.0"` で TS 6 の非推奨を黙らせる（TS 7 では効かない）。
- CommonJS のまま 12 に上げて止める（ユーザーが ESM 化を選んだ）。
- osls 4 に上げる。serverless-layers が osls 4 で消えた `provider.request()` を使っていて動かないので、osls 3 に据え置く。
- serverless-layers 2.8.5 に上げる。作業ディレクトリを 1 ファイル写すたびに消すため package.json が残らず、npm がプロジェクト直下で `--production` の install を流して dev 依存を消す。2.7.0 に固定する。

## 影響

- import を書くときは `.js` を付ける（付け忘れは tsc がエラーにする）。CommonJS のパッケージから名前付きで import すると、tsc を通っても実行時に落ちることがある。`.context/smoke_import_dist.mjs` のように dist を Node で import して確かめる。
- vitest は import の読み込みが緩く、上の「export が無い」を見逃す。CLI・migration を実際に流して確かめる。
- Lambda では依存がレイヤー（`/opt/nodejs/node_modules`・NODE_PATH）にあり、ESM の import は NODE_PATH を見ない。`dist/run.sh` で `register-node-path.js` を `--import` し、見つからない外部パッケージだけ NODE_PATH から探し直す（`module.registerHooks`）。確かめは `.context/smoke_layer_layout.sh`（Lambda と同じ配置で起動する）。
- Express 5 はクエリ解析の既定が simple になり `fields[資源]=項目` が入れ子にならないので、`query parser` を `extended` に戻す（`src/core/configs/express-settings.ts`）。
- helmet 8 で既定のヘッダーが変わった（`block-all-mixed-content` と `Cross-Origin-Embedder-Policy`・`Expect-CT` が無くなり、HSTS は 15552000 → 31536000 秒。PR #182 に一覧）。
- 起動時の読み込み（`AppModule`）は手元で 429 ms → 509 ms（中央値）。
- 版は patch（v4.0.1）。API を使う側から見た互換（v3 の応答）は変わらず、ESM 化はリポジトリの中の話のため。helmet のヘッダーの既定値の変化も互換を切らない。
