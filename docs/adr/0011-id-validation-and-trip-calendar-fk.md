# ADR-0011: id の path param を UUID として検め、列車のダイヤに外部キーを張る

- **日時**: 2026-10-26
- **Agent**: claude-opus-5-5
- **ステータス**: 採用済み
- **ブランチ**: fix/id-validation-and-trip-fk

---

## 背景

- `GET /v3/services/:id/agencies` は、存在しない id でも 200 の `{"service":null,"agencies":[]}` を返していた（`:id/routes`・`:id/stations` は 404）。
- id の path param は形を検めていなかった。`/v3/services/not-a-uuid/routes` などは PostgreSQL の型の誤りで 500 になっていた。
- `trips.calendar_id`・`trips.extra_calendar_id` には外部キーが無かった。TypeORM のモデルに関連が無いためである。本番の 31,384 本はすべて実在するダイヤを指していた（孤児・null は 0 件、extra_calendar_id は全行 null）。
- 本番には、版・variant の桁が RFC から外れた昔の手作りの id が 3 つあった（下の表）。標準の `@IsUUID()` だと、この id は 422 で弾かれる。既に `GET /v3/operations/itinerary-links?calendarId=<規格外>` は 422 になっていた。

## 決定

- **agencies**: service が無ければ query が null を返し、usecase の既存の NotFoundException で 404 にする。存在する id の応答は変えない。
- **id の path param**: 各ドメインの `usecase/params/*.param.ts` に `@IsUUID()` のクラスを置き、`@Param() param` で受ける。形の崩れた id はグローバルの ValidationPipe で 422 になる。形の正しい、存在しない id の動き（404・空配列）は変えない。
  - 検める形は標準の 'all'（版 1〜8・RFC の variant・nil・max）。Nest の `ParseUUIDPipe` も同じ形である。
- **規格外の id**: 'loose' に緩めず、本番のデータを v4 の id に付け替える。付け替えは SQL を 1 回、1 トランザクションで流す。子の行を付け替えてから古い行を消す（既存の外部キーは ON UPDATE NO ACTION のため）。

  | 種類 | 名前 | 古い id | 新しい id |
  |---|---|---|---|
  | ダイヤ | 2019-2020終夜運転ダイヤ | 17612d90-6809-c3a3-1c5a-c739ba3edf05 | 0c6a60c0-1fc7-494f-b41e-8d0054dee88b |
  | ダイヤ | 土休日ダイヤ（2022-03-12〜2023-03-17） | 568a9f62-7e7d-f840-8d3e-f2ae5302ac92 | d647c0e0-8a4c-4d55-8bd4-ca47859246f7 |
  | 運用 | 91（終夜運転ダイヤ） | 224c7776-a11c-6d80-74bc-3178f8ce0742 | 48466260-fd22-409d-a138-b6752ea5a27f |

  付け替える行は、運用 59・例外日 22・列車 874・運用区間 1・目撃 0 である（2026-10-26 時点）。
- **外部キー**: `TripModel` に `calendar`・`extraCalendar` の `@ManyToOne(() => CalendarModel)` を足す。マイグレーション `AddTripCalendarForeignKeys` は generate で作った。ON DELETE・ON UPDATE は既定の NO ACTION、制約名は既定のハッシュ名である。CalendarModel 側の `@OneToMany` は足さない。

## 本番に出す順

1. id を付け替える SQL を流す。外部キーより先に流すのは、列車 874 本の calendar_id を外部キーの無いうちに付け替えるためである。
2. 外部キーのマイグレーションを流す。
3. API をデプロイする。デプロイを付け替えより先にすると、規格外の id のダイヤ・運用は path param でも 422 になる。

## 却下した案

- `@IsUUID('loose')`・正規表現で 8-4-4-4-12 の 16 進だけを見る案。規格外の id を通し続けることになり、既存の query param の `@IsUUID()` とも形がずれる。
- `ParseUUIDPipe` を controller ごとに掛ける案。既存の `ReplaceTripBlockParam` などと書き方がそろわない。
- 規格外の id の主キーを直接 UPDATE する案。既存の外部キーが ON UPDATE NO ACTION のため、子が残っていると失敗する。

## 影響

- 形の崩れた id の応答は 500 から 422 に変わる。存在しない service の agencies は 200 から 404 に変わる。形の正しい id の応答は変わらない。
- client が古い id（ダイヤ 2・運用 1）を URL やストアに持っていると、付け替えの後は見つからなくなる。終夜運転（2019-2020）と 2022 年度の土休日ダイヤは過去のダイヤなので、影響は古いブックマークに限られる。
- 版は patch。使う側の互換は切れない。
