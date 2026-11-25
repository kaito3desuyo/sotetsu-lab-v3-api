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
   - 値 `entry#<namespace>#<key のハッシュ>`: `namespace`・`keyParts`・`body`（JSON を gzip にした Binary）・`tagVersions`・`expiresAt`
   - タグ `tag#<タグ>`: `version`（数）
   - 名前空間 `ns#<namespace>`: `version`（数）

3. **捨てるときは版を上げる。** タグや名前空間の項目の `version` を `ADD 1` で上げる。値の項目は探さず、消しもしない。読むときは、値とその版の項目を 1 回の `BatchGetItem` で取り、記録した版が今の版とすべて同じで、期限も過ぎていなければ当たりとする。版の項目が無いときは 0 とみなす。`load` の前に版を読み、値はその版で書くので、読んでいる最中に誰かが書いても、古い値は次に読まれたときに外れになる。

4. **壊れないための決まり。**
   - 期限は 24 時間。SQL で直に書き換えても、最長 24 時間で入れ替わる。TTL の削除は遅れるので、読むときにも `expiresAt` を見る。
   - 圧縮しても 380KB を超える値は置かない（項目の上限は 400KB）。warn のログを出し、`load` の結果を写さずそのまま返す（DB から取ったばかりで、ほかに共有されないため）。
   - 外れの経路で `getOrLoad` の始まりから 1.5 秒（`SHARED_CACHE_PUT_BUDGET_MS`）を超えていたら、PutItem をせず `load` の結果を返す。予算を超えていなければ、PutItem（最長 1.3 秒＝接続 0.3 秒＋応答 1 秒）を足しても 2.8 秒で、Lambda の timeout 3 秒に収まるため。
   - DynamoDB への呼び出しは、再試行なし、接続 300ms、応答 1 秒で打ち切る（`CdnInvalidation` と同じ）。読むのに失敗したら `load` の結果を返し、置くのに失敗しても応答は返す。どちらも warn のログを出す。
   - `invalidate` は reject しない。書き込みの応答を失敗にしないためだ。代わりに成否を boolean で返す。CLI はこれを見て、失敗なら終了コード 1 で止まる。
   - 捨てるのに失敗すると、編集した人以外には最長 24 時間古い値が残る。warn「共有キャッシュの破棄に失敗しました」をロググループのメトリクスフィルターで数え、1 時間に 1 件以上でアラームにする（`serverless.ts`）。
   - `SHARED_CACHE_TABLE_NAME` が空なら、常に `load` を呼ぶだけにする。手元とテストは今のまま動く。

5. **最初に使う所は 2 つ。** `GET /v3/trip-blocks`（namespace `trip-blocks`、キーは calendarId・方向・`include`・`fields`）と、運用の区間（namespace `itinerary-segments`、キーは calendarId）。どちらもタグは `calendar:<id>`。trip-blocks に書く前の検査は、キャッシュを通さず DB から取る。

6. **編集した人に古いものを見せない。** 要求に `Cache-Control: no-cache` か `Pragma: no-cache` が付いていたら `bypass` にし、DB から取って置き直す。client は列車情報を書いてから 1 時間、時刻表を `cache: 'reload'` で取り（client の ADR-0002）、api の前の CloudFront は見る人のヘッダーを api まで渡すので、この判定が使える。ほかの人には、書いたときのタグの失効で新しいものが出る。

7. **手で捨てる口は CLI。** `npm run cli -- shared-cache invalidate --namespace <ns>`（`--tag <tag>` も受ける）。テーブル名が空のとき、または捨てるのに失敗したときは終了コード 1 を返す。

8. **本番の資源。** `serverless.ts` にテーブル、Lambda の権限、環境変数 `SHARED_CACHE_TABLE_NAME` を足した。権限は実際に呼ぶ `BatchGetItem`・`PutItem`・`UpdateItem` だけに絞り、`GetItem` は与えない。

## 結果

- 費用は月に数円で収まる見込み。約 215KB の値（trip-blocks を gzip にした本番での実測）を結果整合で読むと約 27 RRU、外れたときの書き込みは 1 回約 210 WRU。同じリージョンの Lambda との転送は無料だ。
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
