# 運用の現在位置と、種別・路線の読み取りも共有キャッシュに通す

## なぜやるか

Supabase の Egress を減らすため、共有キャッシュ（ADR-0021）に trip-blocks の一覧と運用の区間を通した。次に行数の多い読み取りは、次の 3 つだ（本番の pg_stat_statements、11/9 からの累計）。

| 問い合わせ | 呼び元 | 回数 | 行数 |
|---|---|---|---|
| 運用＋行程を `operation.id IN (...)` で読む | `GET /v3/operations/current-positions` | 4,796＋1,769＋7,359 | 895 万＋284 万＋67 万 |
| 種別＋運行系統＋路線＋駅 | `GET /v3/services/:id/stations` | 8,313 | 295 万 |
| 種別の名前で路線＋駅を読む | `GET /v3/routes?serviceName=` | 7,766 | 218 万 |

## 方針

### 運用の現在位置

- DB から読む部分（`OperationQuery.findManyForCurrentPosition`）だけを置く。時刻を使う位置の計算（`buildOperationCurrentPosition`）は、毎回その時の時刻でする。client は `searchTime` を送らず、api はその瞬間の時刻を使うので、時刻をキーにすると当たらない
- キーは、運用の id を重ねずに並べ替えたもの。同じダイヤを見ている人どうしで当たる
- タグは、その運用のダイヤの `calendar:<id>`。要求には運用の id しか来ないので、置く前に `SELECT DISTINCT calendar_id FROM operations WHERE id IN (...)` を 1 本引く（主キーで引く軽い問い合わせ）。trip-blocks を書き換えると同じタグで捨てられる
- 置く値はモデルを JSON にしたもの。読むと `createdAt` などの `Date` は文字列になる。位置の計算と応答が、置く前と同じ JSON になることをテストで確かめる
- 存在しない運用の id を含む要求は置かず、DB から直に返す（あとでその運用ができても、含まれる運用のダイヤのタグでは捨てられないため）。置く前に引く id とダイヤの組の数が、重ねない id の数より少なければ、その要求だ
- 名前空間は `operation-current-positions`

### 種別・路線

- `ServiceV3Service.findOneStations`（`GET /v3/services/:id/stations`）と `RouteV3Service.findMany`（`GET /v3/routes`）を置く。キーには `selectionCacheKey({ include, fields })` を入れる（trip-blocks と同じ）
- 名前空間は `service-stations` と `routes`
- api に書き込みの口が無く、SQL で直に直しているので、タグは付けない。期限は今と同じ 24 時間。SQL で直したら `npm run cli -- shared-cache invalidate --namespace service-stations --namespace routes` で捨てる（ユーザーの判断）

### どれにも共通

- 要求の `Cache-Control: no-cache`・`Pragma: no-cache` で読まずに取り直す（`wantsFreshRead`）。controller から `bypassCache` を渡す（trip-blocks と同じ）
- 共有キャッシュの作り（`SharedCache`）は変えない

ほかの案は採らない。

- 現在位置を時刻ごとに置く：上のとおり当たらない
- 置いた結果からタグを決める口を `getOrLoad` に足す：`SharedCache` の作りが変わる。ダイヤを引く 1 本は軽いので、作りを変えるほどではない

## 確かめ方

- 単体のテスト：3 つの読み取りが `getOrLoad` に渡すキー・タグ・名前空間・bypass。現在位置は、キャッシュから読んだときと DB から読んだときで応答が同じになること。id の順と重なりが違ってもキーが同じこと。id が空なら DB にもキャッシュにも行かないこと
- 手元の DynamoDB Local：3 つの口を 2 回ずつ呼び、2 回目に重い問い合わせの回数が増えないことを pg_stat_statements で見る。現在位置は、trip-blocks を書き換えた後に取り直されることも見る

## 記録

- ADR-0021 に、通した読み取りと、基本のデータを手で捨てる決まりを足す
- api の CLAUDE.md の「共有キャッシュ」の行に、基本のデータは SQL で直したら名前空間で捨てることを足す
