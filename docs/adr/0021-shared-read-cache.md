# ADR-0021: 実体をまたいで共有する読み取りのキャッシュを DynamoDB に置く

- **日時**: 2026-11-25
- **Agent**: Claude Opus 5.5（実装は Claude Sonnet 5.5）
- **ステータス**: 採用済み（本番のテーブルはデプロイで作られる）
- **ブランチ**: perf/timetable-memory-cache
- **設計**: docs/superpowers/specs/2026-11-25-shared-cache-design.md
- **関連**: ADR-0012（CDN の失効とタグ）

---

## 背景

- Supabase の Egress が、前の請求期（10/24〜11/24）に Pro プランの 250GB を超えた。今の期（11/24〜12/24）も超えると、12/24 からプロジェクトに制限がかかる。1 日の Egress は 10〜13GB ある。
- Egress のほとんどは、DB から api（Lambda）へ返す問い合わせの結果だ。11/9 から 16 日分の pg_stat_statements の上位は次のとおり。量は、今のダイヤの 1 方向分（12,901 行で 4.6MB）から見積もった。

  | 問い合わせ | 回数 | 返した行 | 量の見積もり |
  |---|---|---|---|
  | trip-blocks（列車位置・ダッシュボード・ダイヤグラム。上下 1 本ずつ） | 8,382 | 2 億 700 万行 | 約 74GB |
  | 運用の区間（`ItinerarySegmentQuery.findManyByCalendarId`） | 57,310 | 1 億 200 万行 | 約 23GB |
  | 全線時刻表の trip-blocks | 1,442 | 3,500 万行 | 約 14GB |

- 時刻表はブラウザの中（`private, max-age=3600`）でしか覚えていない。初めて開いた人の分だけ、毎回 DB まで取りに行く。CloudFront で共有する案は、認証を素通りするので前に却下している。
- 実体ごとのメモリに覚える案は当たらない。本番の実体は 1 日に 350〜450 回作り直され、平均の寿命は 30 分ほどだ（11/18〜24 の実測）。同じ実体に同じキーが 2 回来ることが少ない。

## 決定

1. **実体をまたいで共有する置き場を DynamoDB に作る。** 部品は `src/core/modules/shared-cache/` の `SharedCache`。使う側は `getOrLoad`（キー・タグ・TTL・`bypass`・`load`）と `invalidate`・`invalidateNamespace` を呼ぶ。タグの名前は CDN の失効のタグ（`calendar:<id>`）にそろえ、書き込みの usecase では `cdnInvalidation.invalidate` の隣で同じタグを渡す。

2. **テーブルは 1 つ。** `${param:prefix}-shared-cache-table`。パーティションキー `pk`（文字列）だけで、オンデマンド、TTL の属性は `expiresAt`。項目は 3 種類ある。
   - 値 `entry#<namespace>#<key のハッシュ>`: `namespace`・`keyParts`・`body`（JSON を gzip にした Binary。追記で brotli・分割に変更）・`tagVersions`・`expiresAt`
   - タグ `tag#<タグ>`: `version`（数）
   - 名前空間 `ns#<namespace>`: `version`（数）

3. **捨てるときは版を上げる。** タグや名前空間の項目の `version` を `ADD 1` で上げる。値の項目は探さず、消しもしない。読むときは、値とその版の項目を 1 回の `BatchGetItem` で取り（追記で、値の続きの pk もこの 1 回に入れる）、記録した版が今の版とすべて同じで、期限も過ぎていなければ当たりとする。版の項目が無いときは 0 とみなす。`load` の前に版を読み、値はその版で書くので、読んでいる最中に誰かが書いても、古い値は次に読まれたときに外れになる。

4. **壊れないための決まり。**
   - 期限は 24 時間。SQL で直に書き換えても、最長 24 時間で入れ替わる。TTL の削除は遅れるので、読むときにも `expiresAt` を見る。
   - 圧縮しても 380KB を超える値は置かない（項目の上限は 400KB）。warn のログを出し、`load` の結果を写さずそのまま返す（DB から取ったばかりで、ほかに共有されないため）。この上限は追記で変わった。
   - 外れの経路で `getOrLoad` の始まりから 1.5 秒（`SHARED_CACHE_PUT_BUDGET_MS`）を超えていたら、PutItem をせず `load` の結果を返す。予算を超えていなければ、PutItem（最長 1.3 秒＝接続 0.3 秒＋応答 1 秒）を足しても 2.8 秒で、Lambda の timeout 3 秒に収まるため。書き込みは追記で BatchWriteItem になった。予算の見方と計算は追記の「予算と打ち切りの見直し」で変えた。
   - DynamoDB への呼び出しは、再試行なし、接続 300ms、応答 1 秒で打ち切る（`CdnInvalidation` と同じ）。読むのに失敗したら `load` の結果を返し、置くのに失敗しても応答は返す。どちらも warn のログを出す。
   - `invalidate` は reject しない。書き込みの応答を失敗にしないためだ。代わりに成否を boolean で返す。CLI はこれを見て、失敗なら終了コード 1 で止まる。
   - 捨てるのに失敗すると、編集した人以外には最長 24 時間古い値が残る。warn「共有キャッシュの破棄に失敗しました」をロググループのメトリクスフィルターで数え、1 時間に 1 件以上でアラームにする（`serverless.ts`）。
   - `SHARED_CACHE_TABLE_NAME` が空なら、常に `load` を呼ぶだけにする。手元とテストは今のまま動く。

5. **最初に使う所は 2 つ。** `GET /v3/trip-blocks`（namespace `trip-blocks`、キーは calendarId・方向・`include`・`fields`）と、運用の区間（namespace `itinerary-segments`、キーは calendarId）。どちらもタグは `calendar:<id>`。trip-blocks に書く前の検査は、キャッシュを通さず DB から取る。

6. **編集した人に古いものを見せない。** 要求に `Cache-Control: no-cache` か `Pragma: no-cache` が付いていたら `bypass` にし、DB から取って置き直す。client は列車情報を書いてから 1 時間、時刻表を `cache: 'reload'` で取り（client の ADR-0002）、api の前の CloudFront は見る人のヘッダーを api まで渡すので、この判定が使える。ほかの人には、書いたときのタグの失効で新しいものが出る。

7. **手で捨てる口は CLI。** `npm run cli -- shared-cache invalidate --namespace <ns>`（`--tag <tag>` も受ける）。テーブル名が空のとき、または捨てるのに失敗したときは終了コード 1 を返す。

8. **本番の資源。** `serverless.ts` にテーブル、Lambda の権限、環境変数 `SHARED_CACHE_TABLE_NAME` を足した。権限は実際に呼ぶ `BatchGetItem`・`PutItem`（追記で `BatchWriteItem` に変更）・`UpdateItem` だけに絞り、`GetItem` は与えない。

## 結果

- 費用は月に数円で収まる見込み。約 215KB の値（trip-blocks を gzip にした本番での実測。追記前の形式）を結果整合で読むと約 27 RRU、外れたときの書き込みは 1 回約 210 WRU。追記後の形式で上限の 1.4MB まで使った値なら、読みは約 175 RRU（350KB の 4 項目を 4KB 単位で数え、結果整合は半分）、書きは約 1,400 WRU（1KB 単位）になる。続きが無いときの読みにも、最大 1.5 RRU かかる。月の費用の結論は変わらない。同じリージョンの Lambda との転送は無料だ。
- デプロイの翌日に、pg_stat_statements で trip-blocks と区間の回数を、Supabase で Egress を見て効果を確かめる。
- 覚える値は JSON にできるものに限る。読み出した値は新しいオブジェクトなので、使う側が書き換えてもほかに影響しない。
- `namespace` と `keyParts` を素の属性で持つので、中身を一覧したくなったら、GSI を埋め直しなしで足せる。

## 検討した代案

- **実体ごとのメモリ**: 実体が 1 日に 350〜450 回作り直され、寿命が 30 分ほどなので、ほとんど当たらない。
- **S3**: ユーザーの判断で使わない。
- **CloudFront で共有する**: 認証を素通りするので前に却下している。
- **GSI で値を探して捨てる**: GSI の Query は結果整合でしか読めず、書いた直後の値を消しそびれる。版を上げる方式なら、値を探さずに済む。

## 後で考えること

- trip-blocks の問い合わせを分けて、1 回に返す量を減らす。キャッシュが外れたときの Egress は、これで下がる。

---

## 値を分けて置き、brotli で縮める（2026-11-25 追記）

- **設計**: docs/superpowers/specs/2026-11-25-shared-cache-chunks-design.md
- **ブランチ**: perf/shared-cache-chunks

### なぜやるか

圧縮した値が 380KB を超えると置かない決まりだと、大きな値は毎回 DB へ行く。手元で `include=trips.times` を付けて `fields` 無しで取った一覧（素で 4.3MB）は、gzip で 615KB になり、置けなかった。本番の client が送る取り方（約 215KB）は収まるが、全線時刻表・駅別時刻表の取り方が収まるかは分からず、ダイヤが大きくなれば今収まっているものも超えうる。そこで、上限を超える値も置けるようにする（ユーザーの判断）。

### 測ったこと

上の 4.3MB の一覧を材料にした。

| やり方 | 縮めた後 | 時間 |
|---|---|---|
| gzip（今） | 615KB | 32ms |
| brotli 6 | 462KB | 53ms |
| brotli 11 | 365KB | 6.6 秒 |
| 同じキーの並ぶ配列を列の形にまとめる → brotli 6 | 457KB | ほぼ同じ |
| UUID を表に集めて番号にする → brotli 6 | 420KB | ほぼ同じ |

一覧には 14,548 種類の UUID があり、圧縮した後もその分が大きく残る。データの形を変えても、上限の下には収まらない。

### 決定

1. **brotli 6 で縮める。** gzip と同じくらいの時間で 25% 小さくなる。縮めるときは `BROTLI_PARAM_SIZE_HINT` を付ける。brotli 11 は遅すぎて Lambda の 3 秒に収まらない。列の形・UUID の番号化は効きが小さく、値の形に依存するので採らない。
2. **値を分けて置く。** 縮めた本体を 350KB（`SHARED_CACHE_PART_BYTES`）ごとに切り、最大 4 項目（`SHARED_CACHE_MAX_PARTS`）に分けて置く。合わせて 1.4MB まで。超える値は置かず、warn を出して `load` の結果を返す。`SHARED_CACHE_MAX_BODY_BYTES` は外した。
3. **項目の作り。** 先頭は今と同じ `pk` に `body`（1 つ目の切れ端）・`parts`（切れ端の数）・`writeId` を持つ。続きの `pk` は `entry#<namespace>#<key のハッシュ>#<1〜3>` とし、`body`・`writeId`・`expiresAt` を持つ。`writeId` は書くたびに作る乱数で、先頭と続きがそろわなければ外れにする。書きかけの値や、2 つの書き込みが混ざった値を返さないためだ。
4. **読み書き。** 読みは今の `BatchGetItem` 1 回に続きの 3 つの pk も入れる。書きは `BatchWriteItem` 1 回で、`UnprocessedItems` が残ったら warn を出して応答は返す。残った分は `writeId` の照合で外れになる。打ち切りの設定と書き込みの予算（1.5 秒）は変えない。
5. **古い値は外れにする。** `parts` を持たない gzip の値は外れにする。24 時間で消えるので、読み替えの作りは入れない。
6. **権限。** Lambda の権限から `PutItem` を外し、`BatchWriteItem` を足した。`BatchGetItem`・`UpdateItem` はそのまま。

### 変えないこと

`getOrLoad`・`invalidate`・`invalidateNamespace` の形と振る舞い、テーブルの定義、タグと名前空間の版の作りは変えない。

### 予算と打ち切りの見直し（最終レビューの指摘）

- **書き込みの予算は圧縮のあとで測る。** `SHARED_CACHE_PUT_BUDGET_MS`（1.5 秒）との比較を、`load` の直後から、stringify・brotli・写しの `JSON.parse` のあとへ移した。経過は今までどおり `getOrLoad` の始まりから測る。大きな値を置けるようになり、圧縮の時間が無視できなくなったため。超えたら書かずに `load` の結果を返し、warn を出す振る舞いは同じ。
- **各 send を本体の受け取りまで打ち切る。** `requestTimeout` のタイマーは応答のヘッダーが届くと止まる（`@smithy/node-http-handler` 4.14.2 で確認）。読みの本体は最大約 1.9MB（base64 で送られる量）あり、その受け取りは打ち切れなかった。そこで、各 `send` に `abortSignal: AbortSignal.timeout(SHARED_CACHE_SEND_TIMEOUT_MS)`（1 秒）を付けた。打ち切りで投げられた例外は、これまでの失敗と同じに扱う（読みは外れとして `load`、書きは warn して値を返す、`invalidate` は reject しない）。
- **時間の見積もり。** 書き込みは、予算 1.5 秒を超えていなければ始まり、`BatchWriteItem` は最長 1 秒で打ち切られる。1.5 秒＋1 秒＝2.5 秒で、Lambda の timeout 3 秒に収まり、残りの 0.5 秒が認証などの前後の処理にあたる。前の「最長 1.3 秒」は、ヘッダーが届くまでの話だった。

---

## 運用の現在位置と種別・路線も通す（2026-11-26 追記）

- **設計**: docs/superpowers/specs/2026-11-26-shared-cache-operations-services-design.md
- **ブランチ**: perf/shared-cache-operations-services

### なぜやるか

trip-blocks の一覧と運用の区間を通したあと、次に行数の多い読み取りは次の 3 つだった（本番の pg_stat_statements、11/9 からの累計）。

| 問い合わせ | 呼び元 | 回数 | 行数 |
|---|---|---|---|
| 運用＋行程を `operation.id IN (...)` で読む | `GET /v3/operations/current-positions` | 4,796＋1,769＋7,359 | 895 万＋284 万＋67 万 |
| 種別＋運行系統＋路線＋駅 | `GET /v3/services/:id/stations` | 8,313 | 295 万 |
| 種別の名前で路線＋駅を読む | `GET /v3/routes?serviceName=` | 7,766 | 218 万 |

### 決定

| 読み取り | 名前空間 | キー | タグ |
|---|---|---|---|
| 運用の現在位置（`OperationCurrentPositionReader`） | `operation-current-positions` | 運用の id を重ねずに並べ替えたもの | `calendar:<ダイヤの id>` |
| 種別の駅（`ServiceV3Service.findOneStations`） | `service-stations` | `[serviceId, selectionCacheKey]` | 無し |
| 路線（`RouteV3Service.findMany`） | `routes` | `[serviceName（無ければ ''）, selectionCacheKey]` | 無し |

1. **現在位置は DB から読む部分だけを置く。** 時刻を使う位置の計算（`buildOperationCurrentPosition`）は毎回その時の時刻でする。client は `searchTime` を送らず、api はその瞬間の時刻を使うので、時刻をキーに入れると当たらない。置く値はモデルを JSON にしたもので、`Date` は文字列になる。位置の計算と応答が置く前と同じ JSON になることをテストで確かめた。
2. **現在位置のタグは、置く前に引く。** 要求には運用の id しか来ないので、`OperationQuery.findCalendarIdByOperationIds` で運用の id とダイヤの id の組を `operations` から主キーで 1 本引き、タグを `calendarCacheTags(ダイヤの id)` にする。trip-blocks を書き換えると同じタグで捨てられる。
3. **見つからない id を含む要求は置かない。** 引けた組の数が、重ねない id の数より少なければ、置かずに DB から直に返す。あとでその運用ができても、含まれる運用のダイヤのタグでは捨てられないため。
4. **種別の駅と路線は、キーに `selectionCacheKey({ include, fields })` を入れる**（trip-blocks と同じ）。無い種別は `load` の中で `NotFoundException` を投げるので、置かれない。
5. **種別・路線にはタグを付けない。** api に書き込みの口が無く、SQL で直に直しているため。期限は今と同じ 24 時間。SQL で直したら次で捨てる（ユーザーの判断）。

   ```
   npm run cli -- shared-cache invalidate --namespace service-stations --namespace routes
   ```

6. **3 つとも、要求の `Cache-Control: no-cache`・`Pragma: no-cache` で読まずに取り直す**（`wantsFreshRead`）。controller から `bypassCache` を渡す。
7. `SharedCache` の作りは変えない。

### 採らなかった案

- 現在位置を時刻ごとに置く: 上のとおり当たらない。
- 置いた結果からタグを決める口を `getOrLoad` に足す: `SharedCache` の作りが変わる。ダイヤを引く 1 本は軽いので、作りを変えるほどではない。
