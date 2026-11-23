# ADR-0020: 車両の改造の記録を、起きた日の出来事として車両ごとに持つ

- **日時**: 2026-11-24
- **Agent**: Claude Opus 5.5（実装は Claude Sonnet 5.5）
- **ステータス**: 採用済み（本番の migration は未適用。手元の DB には流して確かめた）
- **ブランチ**: feat/vehicle-modifications
- **設計**: docs/superpowers/specs/2026-11-19-records-formation-design.md（client リポジトリ）
- **関連**: ADR-0010（include・fields）、ADR-0018（子の行の扱い）

---

## 背景

- client の「編成の記録」ページは、編成の組成を車両の絵で出す。絵の塗装は編成と時期で変わる（10701 は YNB、10702 はグループカラー。8000・9000・10000 は旧塗装からグループカラー、YNB へ塗り替えられてきた）。
- 塗り替えのほかにも、リニューアル・機器更新・ホームドア対応のように、車両の経歴として残したい改造がある。見た目の変わらないものも記録したい。
- 始めは `formations` に塗装の列を足す案で、migration も作った（`FormationLivery1795444657610`）。編成は組み換わるが、塗装や改造は車両に付いて移るので、編成の列では持てないと分かり、やめた。

## 決定

1. **表 `vehicle_modifications` を足す。** 1 行が 1 回の改造で、車両（`vehicle_id`）に付ける。

   | 列 | 型 | 中身 |
   |---|---|---|
   | `id` | uuid | |
   | `vehicle_id` | uuid・`vehicles` への外部キー（ON DELETE CASCADE・ON UPDATE CASCADE） | 改造した車両。組み換えても記録は車両と一緒に移る |
   | `modified_on` | date・NULL 可 | 改造した日。NULL は「新製のときから」 |
   | `kind` | varchar | `livery`・`renewal`・`equipment`・`platform-door` から始め、要るときに足す |
   | `value` | varchar・NULL 可 | 種類ごとの値。`livery` では塗装の値 |
   | `description` | text・NULL 可 | 中身の説明。日付が月までしか分からないときもここに書く |
   | `created_at`・`updated_at` | timestamptz | |

   `vehicle_id` にはインデックスを付けた（generate が作る既定の名前）。外部キーの動きは、同じ車両に付く `vehicle_formations` に合わせた。

2. **作り方は A を採る。** 改造を「起きた日」の出来事として 1 行ずつ持つ。ある日の状態は、種類ごとにその日までの最新の行で決まる。塗り替えても前の行を直さない。
   - B（どの種類も開始日と終了日の期間で持つ）: リニューアルのように終わりの無い改造に合わず、塗り替えのたびに前の行を閉じる手間がある。
   - C（塗装の表と改造の表に分ける）: 表と api が 2 つずつになり、前面の形が変わるリニューアルをどちらに入れるか迷う。

3. **集約ルートは編成にする。** 記録は車両に付けるが、読むのも保存するのも編成を通す（編成 → 号車 → 車両 → 改造の記録）。改造の記録を単独で保存・取得するリポジトリや api は作らない。`VehicleModel` に `modifications` の `OneToMany` を足すが、cascade は付けない。保存の口は、書き込みの api を作る段で、編成の集約をまとめて 1 回で書く形にする。

4. **取得は編成の `include` で返す。** `GET /v3/formations/from/:startDate/to/:endDate`（と `as/of/:date`）の `include` に `vehicleFormations.vehicle.modifications` を足した。
   - `include` に挙げたときだけ `vehicle_modifications` を結合する。挙げなければ SQL は変わらない（全部入りの応答にも出さない）。
   - 並びは `modified_on` の古い順で、NULL を先にする（`ORDER BY ... modified_on ASC NULLS FIRST`。編成の並びのあとに足す）。
   - `fields[vehicleModification]` で列を選べる。
   - 期間の取得の木には、これまで `agency` しか無かった。号車・車両・改造の記録の道筋は、`as/of` の木と同じ定義を共有する。

5. **段 1 では書き込みの api を作らない。** 値はユーザーが SQL で入れる。書き込みの api は次の段の管理画面で、上の保存単位に従って作る。

6. **migration は generate で作る**（`1795472690220-VehicleModifications`）。制約名は既定。本番への適用はユーザーが行う。

## 出す順番

1. この変更を含む api を出す。表が無い本番で `include` に挙げると落ちるので、先に migration を本番へ流す。`include` に挙げない既存の呼び出しは、表が無くても動く。
2. client は、api のデプロイのあとに出す。

## 結果

- 手元の DB で migration を流し、1 台の車両に 3 行（NULL の `livery`・日付つきの `livery`・`renewal`）を入れた。期間の取得に `include=vehicleFormations.vehicle.modifications` を付けると、その車両の `modifications` が NULL・2020-03-01・2022-01-01 の順で返った。記録の無い車両は空の配列。確認用の行は消した。
- `include` に挙げなければ、応答にも SQL にも `modifications` は出ない。
- 期間の取得は、全期間（150 行ほど）に記録を付けても 1 本の問い合わせで済む。結合で行が増えるぶん転送は増えるので、client は全期間を 1 度だけ取り、編成番号で絞って使う。

## 検討した代案

- **`formations` に塗装の列を足す**: 組み換えで車両と記録が離れる。見た目の変わらない改造を持てない。
- **車両に `livery` の列を足す**: 塗り替えの経歴が残らず、過去の日の絵が描けない。
