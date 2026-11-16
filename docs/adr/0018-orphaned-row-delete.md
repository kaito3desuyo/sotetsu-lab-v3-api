# ADR-0018: 子の行の削除をトリガーから orphanedRowAction に移す

- **日時**: 2026-11-17
- **Agent**: Claude Sonnet 5.5
- **ステータス**: 採用済み（本番の migration は未適用。手元の DB には流して確かめた）
- **ブランチ**: refactor/orphaned-row-delete
- **関連**: ADR-0017（手で入れたものをリポの migration にする前例）

---

## 背景

- 本番 DB には、リポに定義の無い手作りのトリガーが 3 本ある。
    - `delete_times_on_update_trips_table`（`times`）
    - `delete_trip_operation_lists_on_update_trips_table`（`trip_operation_lists`）
    - `delete_trips_on_update_trip_blocks_table`（`trips`）
- どれも「親の id が NULL になる UPDATE」を受けて、その行を `DELETE` する（`BEFORE UPDATE ... WHEN (new.<親の列> IS NULL)`）。TypeORM が親を cascade 付きで save したとき、配列から外れた子に出す UPDATE を想定したものだった。
- 3 つの列（`times.trip_id`・`trip_operation_lists.trip_id`・`trips.trip_block_id`）は NOT NULL。

## 決定

- 子の側の `@ManyToOne` 3 か所に `orphanedRowAction: 'delete'` を付ける。外れた子を TypeORM が `DELETE` する。
    - `TripModel.tripBlock`・`TimeModel.trip`・`TripOperationListModel.trip`
    - 書き方は `OperationSightingInvalidationModel` に合わせた。
- トリガー 3 本と関数 3 本を、マイグレーション `1794867125005-DropOrphanDeleteTriggers` で消す。`down` は 2026-11-17 に本番から読んだ定義で作り直す。
- 理由は、削除の動きを DB の中の見えない仕掛けに任せず、モデルを読めば分かる形にするため。トリガーの定義がリポに無いと、手元の DB の作り直しや新しい環境で動きが変わる。

## 出す順番

1. orphanedRowAction を含む版を先にデプロイする。
2. そのあとで migration を本番に流す。

逆にすると、コードがまだ「親の id を NULL にする」前提のときにトリガーが無くなり、子を減らす更新が NOT NULL 違反で落ちるおそれがある。

## 確かめた結果

手元の DB（本番の写し・トリガーあり）で、既存の 1 つの trip block を読み込み、トランザクションの中で「trip を 1 本外す」「時刻を 1 つ外す」「運用区間を 1 つ外す」を順に `save` し、最後に ROLLBACK した。外れた行の有無と、親の無い行（`times.trip_id`・`trip_operation_lists.trip_id`・`trips.trip_block_id` が NULL）の数を見た。

| 条件                                    | 外した行の残り                   | 親の無い行 |
| --------------------------------------- | -------------------------------- | ---------- |
| 旧コード + トリガーあり                 | 0 件（trip・時刻・運用区間とも） | 0 件       |
| 新コード + トリガーあり                 | 0 件                             | 0 件       |
| 新コード + トリガーなし（migration 後） | 0 件                             | 0 件       |
| 旧コード + トリガーなし（migration 後） | 0 件                             | 0 件       |

migration のあと、`pg_trigger` の `delete_%` は 0 本、`pg_proc` の `delete_%on_update%` も 0 本になった。

### 想定と違った点

- 旧コード + トリガーなしでも、更新は落ちなかった。TypeORM 1.1.2 の `OneToManySubjectBuilder` は、外れた子の外部キー列が NOT NULL だと、NULL にする UPDATE を出さずに子を `DELETE` する（既定の `nullify` のときの分岐）。旧コードでも出る SQL は `DELETE FROM "trips" WHERE "id" = $1` などで、トリガーを受ける UPDATE は出ていなかった。
- つまり TypeORM 1.x に上げた時点で、トリガーはほぼ働いていなかったと見られる。`orphanedRowAction: 'delete'` は、この暗黙の動きをモデルに書いて固定するもの。
- そのため、出す順番を逆にしても本番で落ちる見込みは低い。それでも、TypeORM の版や列の NOT NULL が変わると動きが変わるので、上の順番を守る。
