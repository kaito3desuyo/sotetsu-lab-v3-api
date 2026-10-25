# v3 の読み取りの口に include（結合の選択）と fields（列の選択）を足す 設計

- 日付: 2026-10-24
- 対象: sotetsu-lab-v3-api（client の切り替えは client リポの別ブランチ・別 PR）
- 前提: ADR-0002（`fields` の項目選択・trip-blocks だけ）を広げ、一部置き換える
- **SSR とは独立**: SSR（client の `feature/ssr-main`・`perf/ssr-quick-wins`）に依存しない。client の切り替えは client の master から切ったブランチで行い、SSR のブランチには積まない。API 側もどの SSR の作業も前提にしない

## 1. 目的

- 読み取りの口で、使う側が「どの関連を結合するか」（`include`）と「どの列を返すか」（`fields`）を選べるようにする
- 結合・SQL の列・応答の組み立て・転送量を、要る分だけに減らして速くする
- 指定が無いときの応答は 1 バイトも変えない（外部公開 M4 を控えているので後方互換）

## 2. 背景と根拠

2026-10-24 の本番の実測（`.context/ssr-plan/response-anatomy.mjs`・`api-local-vs-prod.mjs`。Lambda 1769MB 後）:

- `GET /v3/operations/calendar/:id/trips`: 3.67MB・711ms。列車 1 本あたり約 2KB で、うち `createdAt`・`updatedAt` が約 2 割。運用表は使わない列・関連を多く受け取っている
- `GET /v3/services/:id/stations`: 636KB。うち `service`（運行系統の入れ子）が 384KB（6 割）で、どのページも使っていない
- `GET /v3/trip-blocks`（全線時刻表の `fields` 付き）: 2.27MB。時刻が約 8 割
- 遅いのは DB でなく Lambda の中のエンティティ組み立て（memory: project_api_request_timing_2026-10-14）。結合を減らし、組み立てを builder 経由でなく直接にすると両方効く

`docs/refactor-instructions.md` 4-A は「任意 join は実装しない」としている。本件は口ごとの許可リスト（木）の中でだけ選べる結合なので、4-A に例外として書き足す（新しい ADR）。

## 3. 指定の書き方と応答

```
GET /v3/operations/calendar/:id/trips
    ?include=trips.startTime,trips.endTime
    &fields[operation]=operationNumber
    &fields[trip]=tripNumber,tripClassId,depotIn,depotOut
    &fields[time]=stationId,departureDays,departureTime
```

### 3.1 include

- 応答のキーの道筋を `.` でつなぎ、`,` で並べる。子を書けば親も付く
- 無ければ今と同じ全部入り。空（`include=`）なら関連を 1 つも結合しない
- その口の木に無い道筋、木より深い道筋は 400
- `include` を受けない口（4.5 節）で指定されたら 400

### 3.2 fields

- キーは資源の名前（`trip`・`time` など。ADR-0002 と同じ）
- 同じ資源が複数の道筋に出ても、同じ指定が効く（`startTime`・`endTime` はどちらも `fields[time]`）
- 結合する資源で `fields` の無いものは全列を返す
- `include` と併せたとき、結合されない資源の `fields` は 400
- `include` が無く `fields` だけのときは今の trip-blocks と同じ: 名前のある資源を結合し、親の資源が欠けていれば 400。常に結合する関連（`required`）の資源で名前の無いものは、`alwaysKeys` だけを返す（今の trip-blocks の trip が id だけになるのと同じ）
- 木の `columns` に無い項目は 400

### 3.3 応答

- 結合しなかった関連はキーごと出さない（`null`・`[]` も入れない）
- `include` か `fields` のどちらかがあれば、値が null の項目は省く（false・0・空文字は残す）
- 資源ごとに木で宣言した「常に返すキー」（関連をつなぐ ID）は、`fields` に無くても返す
- 400 の文言は日本語で、今の `parseSparseFieldsets` に合わせる

## 4. 部品

置き場所は `src/core/utils/selection/`。今の `src/core/utils/sparse-fieldsets.ts` はここへ吸収し、使う所が無くなったら消す。

### 4.1 SelectionTree（口ごとに宣言する木）

```ts
interface SelectionNode {
    resource: string | null;           // fields のキー。null は fields で選べない入れ物
    columns: Record<string, string>;   // 応答の項目名 → 元のプロパティ
    alwaysKeys?: readonly string[];    // 常に返す項目（関連をつなぐ ID）
    relations?: Record<string, SelectionRelation>; // 応答のキー → 子
}
interface SelectionRelation extends SelectionNode {
    property: string;                  // 親のオブジェクトのプロパティ名
    many: boolean;                     // 配列か 1 件か
    required?: boolean;                // include で外せない（常に結合・常に返す）
}
```

- 木は応答の形を表す。根は応答をまとめるだけの入れ物（`{ operation, trips }` など。`resource: null`）でもよい
- 許可リストと親子の関係はすべてこの木から出す（ADR-0002 の `requires` は不要になる）
- 木は各ドメインの `usecase/` に置く（今の `trip-block-fieldsets.ts` と同じ場所）。資源ごとの `columns` は、その資源のドメインの `usecase/*-selection-columns.ts` に置いて木どうしで共有する
- `columns` は、今の全部入りの応答に出ている項目に限る（指定で返す項目を広げない）

### 4.2 parseSelection(query, tree) → Selection | undefined

- `include`・`fields` を読み、3 節の決まりで検める。違反は `BadRequestException`
- どちらも無ければ `undefined`。そのときは今の全部入りの道を通る
- controller は `@Query()` の生の値を渡すだけ

### 4.3 selectColumns(alias, node, selection) と各 query の結合

- 応答の入れ物と SQL の別名が 1 対 1 でない口（`{ operation, trips }`・駅一覧の計算）があるので、結合そのものは各 query が `selection.paths.has('道筋')` を見て明示的に書く
- `selectColumns` は、その別名で選ぶ列（主キー `id`・`alwaysKeys`・指定の列。指定が無ければ全列）を返す。`addSelect` に渡す
- 絞り込みのための結合（`filterTrip` など）と `orderBy` は各 query が書く。並べ替えに使う関連は、返さないときも結合だけはして順番を保つ（`addSelect` しない）。ただし trip-blocks の時刻順は、時刻を返すときだけ（今の `fields` の動きのまま）

### 4.4 serializeSelection(models, tree, selection)

- エンティティを木に沿って直接、応答の形にする。DTO builder は通さない
- 外した関連は出さない・null を省く・`alwaysKeys` は残す
- 計算で出す項目（DB の列でないもの）は `columns` に入れない。要る口だけ、木に「計算する項目と元の列」を宣言して足す

### 4.5 口の種類

| 種類 | 受けるもの | 口 |
|---|---|---|
| 関連の木を持つ | `include`・`fields` | trip-blocks（一覧・`:id`）、operations（`calendar/:id/trips`・`from/to`・`:id/trips`）、operation-sightings（`from/to`）、formations（2 本）、services（`:id/stations`・`:id/agencies`・`:id/routes`）、routes（一覧・`:id/stations`）、trips（`station/:id`） |
| read-model（計算した形） | `fields` だけ（DTO を木に沿って削る） | operations（`current-positions`・`:id/current-position`・`itinerary-links`・`next-operation-candidates`）、operation-sightings（`time-cross-section/*` の 4 本） |
| 結合なし | `fields` だけ | calendars（3 本）、calendar-dates、agencies、trip-classes、stations、services（一覧）、operations（`calendar/:id`） |

read-model と結合なしの口は `include` を 400 にする。どの口がどの種類かは実装時に query を読んで確定し、表と違えば plan で直す。

`operations/groups` は DB を読まない決まった表（項目 2 つ）なので対象から外した（PR 3 で確定。ADR-0010）。

### 4.6 全部入りの道は触らない

指定が無いときは、既存の query・builder・エンティティの組み立てをそのまま使う。指定があるときだけ軽い道（SQL の列を絞り、builder を通さない）を通る。

## 5. 出す順

API の PR はどれも後方互換なので、版は minor を上げる。

1. **PR 1: 部品と重い 3 本**
   - `core/utils/selection/`、trip-blocks の寄せ直し、`operations/calendar/:id/trips`、`services/:id/stations`
   - ADR を新しく 1 本書く（ADR-0002 を「一部置き換え」にし、refactor-instructions 4-A に `include` の例外を書き足す）
2. **PR 2: 運用・目撃・編成**
   - 関連の木を持つ: `operations/from/to`、`operations/:id/trips`、`operation-sightings/from/to`、formations の 2 本
   - read-model の口すべての `fields`
3. **PR 3: 残り全部**
   - routes、services の `:id/agencies`・`:id/routes`、`trips/station/:id`、`trip-blocks/:id`
   - 結合なしの口すべての `fields`

client は、API の版が本番に出たあと、口ごとの切り替えを client の master から切ったブランチで出す（SSR のブランチに積まない）。

## 6. 確かめ方

- **部品**: `parseSelection` の 400 の各規則と、`serializeSelection`（関連を外す・null を省く・`alwaysKeys`）の unit spec
- **各口**: 指定なしの応答が今と同じであることを query の spec で確かめる
- **trip-blocks**: client が今使っている `fields` だけの呼び出しが、寄せ直しの前後で同じ応答になることを確かめる
- **効き目**: PR ごとに本番で `response-anatomy.mjs`・`api-local-vs-prod.mjs` を前後で流し、大きさと待ち時間を比べる

## 7. 変えないもの

- `Cache-Control`。クエリが違えば URL が違うので、キャッシュは混ざらない（CloudFront は `QueryStringBehavior: all`、client の QueryCache は引数からキーを作る）
- 任意の filter・sort は引き続き実装しない
- 書き込みの口

## 8. 範囲外

- 応答の形そのものの変更（配列で返す・キー名を縮める）。外部公開 M4 で考える
- Postgres の `json_agg` での組み立て、版ごとのプロセス内キャッシュ。本件の効き目を測ってから考える
