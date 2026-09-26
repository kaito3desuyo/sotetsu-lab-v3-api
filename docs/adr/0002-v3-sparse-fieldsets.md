# ADR-0002: v3 の読み取りの口に返す項目の選択（fields）を足す

- **日時**: 2026-09-26
- **Agent**: claude-opus-5-5
- **ステータス**: 採用済み
- **ブランチ**: feature/redesign-2026-07

---

## 背景

- 列車位置情報（client）は、ダイヤ 1 つぶんの全列車を `GET /v3/trip-blocks?calendarId=…&tripDirection=…` で取っている。
- 手元の実測（2026.3改正 平日ダイヤ）で、1 方向あたり約 5.9MB の JSON を返していた（列車 1,870 本・時刻 2 万件余り）。
- その大半は、画面で使わない項目だった（作成日時・更新日時・時刻の ID・乗降の区分・種別の中身など）。
- Lambda の応答は 1 回 6MB（6MiB）が上限で、平日はほぼ上限に張り付いている。CloudFront の圧縮（`Compress: true`）は転送量を減らすが、Lambda の上限は圧縮前の大きさにかかる。
- 列車ダイヤグラム・全線時刻表も同じ列車データを、別の項目の組み合わせで使う。

2026-06-11 の決定（`docs/refactor-instructions.md` 4-A）では、v3 は `@dataui/crud` を使わず口ごとに明示的に書き、「任意 filter・任意 join・任意 sort は実装しない」としていた。

## 決定

### 1. 返す項目を選ぶ `fields` の指定を足す（sparse fieldsets）

`@dataui/crud` は使わない（古いライブラリのため。ユーザー指示 2026-09-26）。小さな部品を `src/core/utils/sparse-fieldsets.ts` に自前で作る。

指定の書き方（JSON:API の sparse fieldsets に倣う）:

```
GET /v3/trip-blocks?calendarId=…&tripDirection=0
    &fields[trip]=tripNumber,tripDirection,tripBlockId,tripClassId,depotIn,depotOut
    &fields[time]=stationId,stopSequence,arrivalDays,arrivalTime,departureDays,departureTime
    &fields[tripOperationList]=operationId
    &fields[operation]=operationNumber
```

決まり:

- `fields` が無ければ、今と同じ全項目を返す（既存の呼び出し元は変わらない）。
- 資源ごとに**選んでよい項目の許可リスト**を持つ。リストに無い資源・項目は 400 を返す。
- `fields` があるとき、指定のある資源の関連だけを結合して返す。親子の関係で要る資源（`operation` には `tripOperationList`）が欠けていれば 400。
- 資源をまとめる ID（trip-block の `id` と trip の `id`）は常に返す。ほかの ID は指定したときだけ返す。
- `fields` があるとき、値が null の項目は省く（通過駅の着発時刻など）。
- SQL でも指定された列（と結合に要る主キー）だけを選ぶ。

### 2. 適用範囲

まず `GET /v3/trip-blocks` に入れる。ほかの v3 の読み取りの口は、要るようになった時点で同じ部品を使う。

### 3. 方針の改訂

`docs/refactor-instructions.md` 4-A の「任意 filter・任意 join・任意 sort は実装しない」に、この ADR による `fields`（許可リスト付きの項目選択）を例外として書き足す。任意の filter・sort は引き続き実装しない。

## 結果

- 列車位置情報が要る項目だけを取ると、平日ダイヤで 1 方向あたり約 5.9MB → 約 1.8MB（client での試算）。Lambda の上限までの余裕ができる。
- 何が返るかは許可リストで明示されるので、v3 の「明示的な口」の狙いは保たれる。
- 代わりに、クライアントの型は「どの項目も省略されうる」前提になる。

## 検討した代案

- **位置表示専用の口（`/v3/trip-blocks/compact`）**: 型は固くなるが、ページごとに口が増える。ユーザーの判断で汎用の形を採った。
- **`@dataui/crud` の `?fields=` `?join=`**: 古いライブラリなので使わない。
- **配列（タプル）で返す**: 1 方向約 1.0MB まで縮むが、クライアントの変換処理を作り直すことになるので採らない。
