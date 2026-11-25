# 実体をまたいで共有する読み取りのキャッシュ（DynamoDB）

## なぜやるか

Supabase の Egress が、前の請求期（10/24〜11/24）に Pro プランの 250GB を超えた。今の期（11/24〜12/24）も超えると、12/24 からプロジェクトに制限がかかる。1 日の Egress は 10〜13GB ある。

Egress のほとんどは、DB から api（Lambda）へ返す問い合わせの結果だ。11/9 から 16 日分の pg_stat_statements では、上位はこうなっていた。量は、今のダイヤの 1 方向分（12,901 行で 4.6MB）から見積もった。

| 問い合わせ | 回数 | 返した行 | 量の見積もり |
|---|---|---|---|
| trip-blocks（列車位置・ダッシュボード・ダイヤグラム。上下 1 本ずつ） | 8,382 | 2 億 700 万行 | 約 74GB |
| 運用の区間（`ItinerarySegmentQuery.findManyByCalendarId`） | 57,310 | 1 億 200 万行 | 約 23GB |
| 全線時刻表の trip-blocks | 1,442 | 3,500 万行 | 約 14GB |

時刻表はブラウザの中（`private, max-age=3600`）でしか覚えていない。だから、初めて開いた人の分だけ毎回 DB まで取りに行く。CloudFront で共有する案は、認証を素通りするので前に却下している。

api の実体ごとのメモリに覚える案も考えた。だが本番の実体は 1 日に 350〜450 回作り直され、平均の寿命は 30 分ほどしかない（11/18〜24 の実測）。同じ実体に同じキーが 2 回来ることが少ないので、ほとんど当たらない。

そこで、実体をまたいで共有する置き場を DynamoDB に作る。時刻表のように、変わることが少ないのに何度も読まれるデータを覚えておく。

## 目標

- trip-blocks の一覧と運用の区間で DB に行く回数を、「書いた後」と「期限切れ」のときだけに減らす。
- ほかのデータにも使える部品にする。種類を足すときは、テーブルを変えずに、キーとタグを決めるだけで済むようにする。
- キャッシュが壊れても、応答は今と同じに返す。

## しないこと

- S3 は使わない（ユーザーの判断）。
- 実体ごとのメモリのキャッシュは作らない。
- client は変えない。
- 問い合わせを分けて 1 回の量を減らす直しは、このあとで別に考える。

## 作り

### 部品

`src/core/modules/shared-cache/` に `SharedCache` を置く。使う側は次の 2 つだけを呼ぶ。

```ts
sharedCache.getOrLoad({
    namespace: 'trip-blocks',                    // 種類。丸ごと捨てる単位
    key: [calendarId, tripDirection, selectionKey], // 種類の中で何を覚えるか
    tags: [`calendar:${calendarId}`],            // 何が変わったら捨てるか
    ttlSeconds: 86_400,
    bypass,                                      // true なら読まずに load して置き直す
    load: () => ...,                             // DB から取る
});
sharedCache.invalidate({ tags: [`calendar:${calendarId}`] });
sharedCache.invalidateNamespace({ namespace: 'trip-blocks' });
```

タグの名前は、CDN の失効のタグ（`calendar:<id>` など、ADR-0012）にそろえる。書き込みの usecase では、`cdnInvalidation.invalidate` の隣で同じタグを渡せば済む。

### テーブル

テーブルは 1 つにする。名前は `${param:prefix}-shared-cache-table`（本番は `sotetsu-lab-v3-prod-api-shared-cache-table`）。`serverless.ts` のほかの資源と同じく、接頭辞に種類の名前（`-bucket`・`-lambda`・`-role`）を続ける形にそろえた。パーティションキーは `pk`（文字列）だけで、オンデマンド、TTL の属性は `expiresAt` だ。

| 項目 | `pk` | 持つもの |
|---|---|---|
| 値 | `entry#<namespace>#<key のハッシュ>` | `namespace`・`keyParts`（素の文字列）・`body`（JSON を gzip にした Binary）・`tagVersions`（書いたときのタグと名前空間の版）・`expiresAt` |
| タグ | `tag#<タグ>` | `version`（数） |
| 名前空間 | `ns#<namespace>` | `version`（数） |

- **捨てる**：タグや名前空間の項目の `version` を `ADD 1` で上げる。値の項目は探さず、消しもしない。
- **読む**：値の項目と、その値が持つタグ・名前空間の項目を、1 回の `BatchGetItem` で取る。値に記録した版が今の版とすべて同じで、期限も過ぎていなければ当たりとする。版の項目がまだ無いときは 0 とみなす。
- **取り直す**：`load` を呼ぶ前にタグと名前空間の版を読み、値はその版で書く。DB から読んでいる最中に誰かが書いても、古い値は次に読まれたときに外れになる。
- 値の項目は、DynamoDB の TTL で消える。TTL の削除は遅れることがあるので、読むときにも `expiresAt` を見る。

`namespace` と `keyParts` は素の属性で持たせる。後で中身を一覧したくなったら、複数の属性で組む GSI（2025-11 から使える）を、データを埋め直さずに足せる。捨てる処理に GSI を使わないのは、GSI の Query が結果整合でしか読めず、書いた直後の値を消しそびれるからだ。

### 壊れないための決まり

- 圧縮しても 380KB を超える値は置かない。warn のログを出して、`load` の結果をそのまま返す（項目の上限は 400KB）。
- DynamoDB への呼び出しは、再試行なし、接続 300ms、応答 1 秒で打ち切る（`CdnInvalidation` と同じ。Lambda の timeout は 3 秒）。読むのに失敗したら `load` の結果を返す。置くのに失敗しても、応答は返す。どちらも warn のログを出す。
- `invalidate` も reject しない。書き込みの応答を失敗にしないためだ。
- テーブル名の環境変数（`SHARED_CACHE_TABLE_NAME`）が空なら、常に `load` を呼ぶだけにする。手元とテストは今のまま動く。
- 覚える値は JSON にできるものに限る。読み出した値は JSON から作り直した新しいオブジェクトなので、使う側が書き換えてもほかに影響しない。

### 最初に使う所

| 使う所 | namespace | key | タグ |
|---|---|---|---|
| `GET /v3/trip-blocks`（calendarId・方向での一覧。`include`・`fields` の有無を問わない） | `trip-blocks` | calendarId、方向、`include`・`fields` を並べ直した文字列 | `calendar:<id>` |
| 運用の区間（`ItinerarySegmentQuery.findManyByCalendarId` を読む所） | `itinerary-segments` | calendarId | `calendar:<id>` |

- trip-blocks に書いたら、そのダイヤのタグを捨てる。書いた trip-block が前に属していたダイヤも含める（今の CDN の失効と同じ組）。
- trip-blocks に書く前の検査（次の運用の突き合わせ）は、キャッシュを通さずに DB から取る。
- 目撃を投稿するときの検査は、キャッシュを通してよい。区間が変わればタグで捨てるので、古い区間では検査しない。

### 編集した人に古いものを見せない

client は、列車情報を書いてから 1 時間、時刻表を `cache: 'reload'` で取る（client の ADR-0002）。このときブラウザは `Cache-Control: no-cache` を付けて送る。api の前の CloudFront は、見る人のヘッダーを api まで渡す（Managed-AllViewerExceptHostHeader）。そこで、要求に `Cache-Control: no-cache` か `Pragma: no-cache` が付いていたら `bypass` にする。DB から取って、取った結果で置き直す。

捨てるのは書いたときなので、ほかの人にもすぐ新しいものが出る。`bypass` は、DynamoDB の結果整合のずれ（1 秒ほど）や、捨てるのに失敗したときの備えになる。

### 期限と手で消す口

- 期限は 24 時間にする。SQL で直に書き換えたときも、最長 24 時間で入れ替わる。
- すぐ入れ替えたいときのために、CLI を足す：`npm run cli -- shared-cache invalidate --namespace trip-blocks`（`--tag calendar:<id>` も受ける）。

## 足すもの

- 依存：`@aws-sdk/client-dynamodb`。版は今の `@aws-sdk/client-cloudfront` にそろえる。
- `serverless.ts`：テーブル（オンデマンド、TTL）、Lambda の `BatchGetItem`・`PutItem`・`UpdateItem` の権限、環境変数 `SHARED_CACHE_TABLE_NAME`。
- ADR-0021。

## 確かめ方

- 単体のテストで、当たり・外れ・タグを捨てた後・名前空間を捨てた後・`bypass`・期限切れ・大きすぎる値・DynamoDB の失敗・テーブル名なしを確かめる。DynamoDB は `send` を差し替えて調べる。
- 手元では DynamoDB Local（docker）で通しを見る。
- デプロイの翌日に、pg_stat_statements で trip-blocks と区間の回数を、Supabase で Egress を見る。

## 費用の見込み

本体が約 215KB の値を読むと、結果整合の読みで約 27 RRU かかる。書くのは、外れたときだけで 1 回約 210 WRU だ。どちらも、今の回数でも月に数円で収まる。同じリージョンの Lambda との転送は無料だ。

## 作る人に任せること

- キーのハッシュの作り方（sha256 の先頭など）。
- gzip と brotli のどちらで縮めるか（Node の `zlib` にある方）。
- DynamoDB のクライアントの作り方は、`CdnInvalidation` にそろえる。
