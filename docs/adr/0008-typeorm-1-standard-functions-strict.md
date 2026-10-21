# ADR-0008: TypeORM 1.x に上げ、lodash を標準の関数に置き換え、strict を有効にする

- **日時**: 2026-10-21
- **Agent**: claude-opus-5-5
- **ステータス**: 採用済み
- **ブランチ**: refactor/typeorm-1-es-toolkit-strict
- **spec**: docs/superpowers/specs/2026-10-21-typeorm-1-es-toolkit-strict-design.md

---

## 背景

- ADR-0007（NestJS 12・ESM）で、typeorm 0.3 の据え置き・lodash・`strict: false` の明示を後回しにした。
- `@nestjs/typeorm` 12 の peer は `typeorm ^1.0.0-dev`。
- lodash は ESM から名前付きで読むと実行時に落ちるため、関数ごとの default import で凌いでいた。

## 決定

- typeorm を 1.1.x に上げる。
  - 公式 codemod を流したが、該当する書き方が無く変換は 0 件だった。
  - `EntityManager.connection` は `dataSource` に直す（`operation-sighting.query.ts`）。
  - find のオプション `join` は 1.x で無くなったので、`relations` のオブジェクト指定に直す（`trip-block.cli.service.ts`）。
    - 中身は前と同じではない。`relations` の結合は `where: { trips: { calendarId } }` と同じ別名を使うので、block の列車もコピー元のダイヤの分だけに絞られる（`join` のときは block の列車を全部取っていた）。
    - コピー元のダイヤの列車だけを写すほうが意図に合う。2026-10-21 の本番 DB では、ダイヤの違う列車が混ざる block は 24,685 件中 0 件で、今は結果が変わらない。
  - 1.x では、find と update・delete・softDelete・restore の where に undefined・null が来ると、既定（`invalidWhereValuesBehavior: "throw"`）で例外を投げる。0.3 はその条件を黙って外していた（全件が対象になりえた）。今のコードに当たる経路は無い。既定のままにして、値が欠けたまま問い合わせる誤りを見つけやすくする。
  - 1.x で CHECK 制約の既定名のハッシュが変わり、`migration:generate` が `trip_operation_lists` の制約名だけの差分を出した。式は同じ。掟（既定のハッシュ名・generate で作る）どおり `1792549038033-RenameTripOperationListCheckForTypeorm1` を足す。
- lodash を外し、標準の関数を使う。
  - `cloneDeep` してから `sortBy`・`reverse` していたのを `toSorted`・`toReversed` にする（ES2023。元の配列を書き換えないので複製が要らない。`toSorted` は安定ソート）。
  - `isEqual` → `node:util` の `isDeepStrictEqual`。
  - 標準で足りないものが出たときだけ es-toolkit 本体を使う。今回は無かったので依存に足していない。
  - 古いシード（`db/backup`・`db/oldSeedMigration`・`db/seeds` の補助 2 ファイル）には lodash の import が残る。tsc・build・npm script の対象外なので放置する。
- strict を TS 6 の既定（有効）に戻す。
  - エンティティ・DTO など値を外から詰めるプロパティには `!` を付ける（624 か所）。
  - それ以外は型を黙らせない。null が来うる所は `| null` を付けて分岐する。結合の前提があって必ずある所だけ、理由のコメント付きで `!` を付ける。
  - `as any`・`@ts-ignore`・`@ts-expect-error` は使わない。`as unknown as` はテストのモックだけ。
  - `useDefineForClassFields: false` は残す（デコレータとフィールドの初期化の順を変えないため）。
- 結合されているはずの関連（運用の時刻・運行系統の路線と始終点・列車の時刻と運用・block の列車）が欠けていたら、TypeError で落ちていたのをやめ、どこが欠けたかを添えた `UnexpectedError`（500）にする。
- 入力 DTO は 5 系統（時刻・運用のつながり・列車・block・目撃）と運行日例外を同じ形に揃える。
  - `Base…Dto<Id>` から `Validatable…Dto<Id>` を継承し、Create は `Validatable<undefined>`、Replace は `Validatable<string | undefined>` を継承する。
  - 上書きされる id 類の型は型引数 `Id`（既定は `string`）で表す。
  - Details は既定の `string` で Base を継承する（`TimeDetailsDto` も `BaseTimeDto` を継承させた）。
  - 名前の揺れ（`BaseVehicleFormationModel`）は `BaseVehicleFormationDto` に直す。

## 根拠

- Validatable が Base を継承するのは 1d094cd（継承漏れの修正）で意図的に足されたもの。strict にすると、Create の `id: undefined` が Base の `id: string` とぶつかる（TS2416）。継承を外さずに、id の型を引数にして解く。
- コピーの CLI は Details を Create に型だけで読み替えていた。strict では通らないので、`plainToInstance(CreateTripBlockDto, …)` で変換する。コピー元の id 類は Create の `@Exclude` で落ち、組み立て時にコピー先の id で埋め直される。
  - 変換に `transformerOptions`（`excludeAll`・`excludeExtraneousValues`）は渡さない。Create の項目には `@Expose` が無く、全部落ちるため。

## 却下した案

- lodash を es-toolkit の compat に替える。標準の関数で足りる。
- Validatable の `extends Base` を外して TS2416 を避ける。継承漏れを直したコミットを戻すことになる。
- Base の項目を任意（`?`）にする。Details の型まで緩む。

## 影響

- 本番 DB で `npm run migration:run` を流して CHECK 制約の名前を変える。流さなくても動作は変わらないが、次の `migration:generate` に同じ差分が出る。
- 書き込みの確かめで作ったテスト列車は `.context/cleanup_typeorm1_test_trips.sql` で消す。
- 結合漏れの 500 は、今までも TypeError の 500 だった。応答の本文は `UnexpectedErrorFilter` の固定の文言のまま。何が欠けたか（関連と id）は fatal のログに出る。
- 確かめ方:
  - migration の差分が制約名だけであること
  - GET 65 本が本番と一致すること
  - fields 付きの trip-blocks が本番と同じバイト数であること
  - 書き込み（POST・PUT・列車の削除と追加）
  - Lambda と同じ配置での起動
  - dist の import スモーク
- 版は patch（v4.0.2）。API を使う側から見た v3 の応答は変わらない。
- PR #184。
