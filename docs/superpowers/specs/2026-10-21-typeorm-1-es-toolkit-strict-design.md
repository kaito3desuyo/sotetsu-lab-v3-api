# TypeORM 1.x 化・lodash 撤去・strict 有効化 設計

- 日付: 2026-10-21
- 対象: sotetsu-lab-v3-api のみ
- 前提: NestJS 12・TypeScript 6・ESM 化は済んでいる（ADR-0007・v4.0.1）
- ブランチ: `refactor/typeorm-1-es-toolkit-strict`（PR は 1 本）

## 1. 目的

- ADR-0007 で後回しにした 3 つを片付ける
  - typeorm を 0.3 から 1.1.x に上げる
  - lodash をやめる（標準で足りるものは標準、足りないものだけ es-toolkit）
  - tsconfig の `strict: false` を外し、TypeScript の strict を有効にする
- v3 の振る舞い（URL・応答の中身・Cache-Control・認証・ヘッダー）は変えない

## 2. 背景と根拠（2026-10-21 時点の実測）

- typeorm の latest は 1.1.2。`@nestjs/typeorm` 12 の peer は `^0.3.0 || ^1.0.0-dev` で、1.1.2 を受け入れる。typeorm 1.1.2 の engines は `^20.19.0 || ^22.13.0 || >=24.11.0` で、手元・CI・Lambda は Node 24（mise.toml）
- 1.0 で消えた API（`Connection`・`findByIds`・`findOneById`・`exist`・`@EntityRepository`・`relations` の配列指定・`QueryRunner.connection` など）を src・db/migrations・db/seeds・test で探すと、typeorm の API として使っているのは `db/seeds` の補助 2 ファイルの `relations: [...]` だけだった。`findOneById` は自前の Query・Service のメソッド名
  - そのため、影響は API の名前でなく挙動（生成される SQL・null と undefined の扱い・スキーマの読み方・書き込み）に出ると見て、検証で押さえる
- lodash は src では関数ごとの default import が 3 つだけ（`service.query.ts` の `cloneDeep`・`sortBy`、`core/classes/value-object.ts` の `isEqual`）。残り 33 か所は `db/backup`・`db/oldSeedMigration`（2019〜2020 年の初期データ投入用）と、それだけが呼ぶ `db/seeds/trips_seed_import_functions.ts`・`db/seeds/operation_sighting_import_functions.ts`。どれも tsconfig の exclude にあり、npm script からも呼ばれない
- `strict: true` で tsc を流すと 728 件。うち 624 件が TS2564（初期化していないプロパティ）で、ほぼ TypeORM のエンティティと DTO。残りは TS18048・TS2322・TS2416・TS2532・TS7053・TS2345 など約 100 件

## 3. 段 1 — lodash をやめる（標準を優先）

- 標準（ECMAScript・Node の組み込み）で足りるものは標準を使い、足りないものだけ es-toolkit にする（ユーザーの指示）。今の 3 つはどれも標準で足りるので、es-toolkit は入れない見込み。足りないと分かった時だけ es-toolkit の本体（`es-toolkit`）を足す
- `lodash`・`@types/lodash` を外す
- 置き換え
  - `sortBy(arr, (o) => o.stationSequence)` → `arr.toSorted((a, b) => a.stationSequence - b.stationSequence)`（ES2023・安定ソート）。降順側の `.reverse()` は `toSorted` が返す新しい配列に掛かるので元の配列を壊さない
  - `cloneDeep(pickedRouteStationLists).reverse()` → `pickedRouteStationLists.toReversed()`。複製は元の配列を `reverse` で壊さないためだけなので、浅い逆順コピーで足りる（中身は書き換えていない）
  - `isEqual(this.props, vo.props)` → `isDeepStrictEqual`（`node:util`）
- 置き換え前に spec で今の挙動を押さえる
  - 並べ替え: 同じ `stationSequence` を含む入力で順が保たれる・元の配列が変わらない
  - `ValueObject.isEqual`: 入れ子のオブジェクト・配列・Date・undefined のプロパティの有無で、lodash の `isEqual` と同じ結果になる。違いが出たらその場で記録し、使う所（各ドメインの値オブジェクト）で困らないかを見て決める
- `db/backup`・`db/oldSeedMigration`・上の補助 2 ファイルには触らない（ユーザーの選択）。import 先が無い状態で残るが、tsc・build・npm script の対象外なので何も壊れない

## 4. 段 2 — typeorm 1.1.x

- `typeorm` を `^1.1.2` にする。`@nestjs/typeorm` はそのまま 12
- 公式の codemod（`npx @typeorm/codemod v1 src/ db/migrations/ test/`）を流し、差分を全部読む。codemod が package.json で上げる他の依存は鵜呑みにせず、要るものだけ残す。codemod が直せない所は upgrading guide（typeorm.io/docs/releases/1.0/upgrading-from-0.3）を引いて手で直す
- CLI 用の `npm run typeorm`（`node --import @swc-node/register/esm-register ./node_modules/typeorm/cli.js`）が 1.x の cli の場所で動くかを見る。場所が変わっていれば直す
- 確かめること
  - `migration:generate` が「No changes in database schema were found」（エンティティの読み方が変わって差分が出ないこと）
  - 手元と本番の GET 突き合わせ 65 本が一致（`.context/compare_local_prod.py`）と `fields` の確認（`.context/probe_fields.py`）
  - 書き込みテスト（`.context/write_test.py`。trip-blocks の登録・更新・削除・add-trip）。本番 DB に書くので、後始末の SQL はユーザーに流してもらう
  - e2e・`dist` の import スモーク（`.context/smoke_import_dist.mjs`）・Lambda と同じ配置での起動（`.context/smoke_layer_layout.sh`）・CLI（`operation-sighting rebuild-latest-cache` の `--help` まで）

## 5. 段 3 — strict 有効化

- tsconfig.json の `"strict": false` を消す（TS 6 の既定で strict になる）。`useDefineForClassFields: false` は残す（TypeORM・class-validator のデコレータが、クラスのフィールド定義で値を上書きされないように）
- TS2564 は `!`（確定代入）を付けて片付ける（ユーザーの選択）。対象は TypeORM・class-validator・class-transformer・Nest が値を詰めるクラスのプロパティ。`?` にはしない
- 残りの約 100 件は、黙らせずに直す
  - 本当に null・undefined が来る所は分岐を足す。来ないことが型の外で保証されている所だけ `!` か型の絞り込みにし、理由を 1 行コメントで残す
  - `as any`・`@ts-ignore`・`@ts-expect-error` は足さない
  - 暗黙の any（TS7005・TS7034・TS7053）は型を書く
- spec ファイルも tsc の対象なので同じ基準で直す
- 振る舞いを変える直し（分岐を足して早く返すなど）は、その分岐を通る spec を足してから入れる

## 6. 版と記録

- 使う側から見た互換は変わらないので patch（v4.0.2）。コミットの型は `build`（依存）・`refactor`（置き換え・型）で、`!` は付けない
- ADR-0008 を書く: typeorm 1.x に上げた理由と確かめ方・lodash を標準に置き換えた理由（標準優先・足りない時だけ es-toolkit）・strict の方針（`!` の基準と黙らせない方針）・古いシードを放置した理由
- CLAUDE.md の技術スタック（TypeORM 1.x）と ESM の節の lodash の記述を直す

## 7. 完了の条件

- `npx tsc --noEmit` 0 件（strict 有効）、`npm run lint` 0 件、`npm run build` が通る
- ユニット・e2e が全部通る（サンドボックス外）
- `migration:generate` が差分なし
- GET 突き合わせ 65/65、`fields` が本番と同じバイト数
- 書き込みテストが通る
- `dist` import スモーク全件・Lambda 配置で「Nest application successfully started」
- PR の CI が全部通る

## 8. やらないこと

- socket の osls 4 化
- `db/backup`・`db/oldSeedMigration`・`db/oldTableMigration` の整理や削除
- `serverless package` を手元で流すこと（S3 の layers/package.json を上書きして CI が古いレイヤーを使い回すため）
