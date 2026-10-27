# 画面の CDN キャッシュの失効（SSR リリース 3） 設計

- 日付: 2026-10-27
- 親の spec: client の `docs/superpowers/specs/2026-10-12-ssr-design.md`。主に 6.2 章を使い、13.3 章ではリリース 3 にあたる
- 順番: client の 2c（SSR を本番で有効にする）より先に出す（2026-10-27・ユーザー判断）

## 1. 目的

2c のあと、時刻表・運用表などの HTML は CloudFront に 1 週間置かれる（`s-maxage=604800`）。だから、列車情報や目撃を書き込んだら、その画面のキャッシュを API が捨てる必要がある。そうしないと、SSR で初めて開いた人には最長 1 週間、古い画面が出る。

## 2. 前提（2026-10-27 に読んで確かめたこと）

### 2.1 client が付けるタグ

ヘッダー名は `Cache-Tag`。値は小文字で、カンマ区切りにする（`src/app/core/ssr/cache-control.ts`）。

| タグ | 付けるページ | 置く長さ |
|---|---|---|
| `calendar:<calendarId>` | 駅別時刻表・全線時刻表・運用表・行路図・ダイヤグラム | 1 週間 |
| `sighting-date:<YYYY-MM-DD>` | 過去の運用情報（表示する日ごとに 1 つ） | 今日以降を含めば 1 分、過ぎた日だけなら 1 週間 |

- URL に `calendar_id` が無い時刻表は、サーバーで日付つきの URL に飛ばす（短く置く）。だから、タグの無い時刻表は長く置かれない。
- 日付の区切りは client（`getRailwayDate`）も api（`getBaseDate`）も 4 時でそろっている。

### 2.2 書き込みの入口

| 入口 | 変わるもの | 捨てるタグ |
|---|---|---|
| `POST /v3/trip-blocks/bulk` | 列車情報 | 書いた列車の `calendar:<id>`（重複は除く） |
| `PUT /v3/trip-blocks/:id` | 列車情報 | 書き換え前と後の両方の `calendar:<id>` |
| `PATCH /v3/trip-blocks/:id/add-trip`・`/delete-trip` | 列車情報 | 関係する列車の `calendar:<id>` |
| `POST /v3/calendar-dates`・`DELETE /v3/calendar-dates/:id` | 臨時ダイヤの日付 | その calendar の `calendar:<id>` |
| `POST /v3/operation-sightings` | 目撃 | 目撃の日（4 時区切り）が今日より前なら `sighting-date:<日付>` |
| `PATCH /v3/operation-sightings/:id/invalidate`・`/restore` | 目撃 | 同上 |

- 今日以降の目撃は、ページを 1 分しか置かないので捨てなくてよい（spec 6.2）。月 3,700 件の目撃で無料枠を使わずに済む。
- calendar-dates が変わるのは、まれな臨時ダイヤのときだけだ。捨てる数は小さいので、含める（判断：Claude）。

### 2.3 量と料金

- 失効は、月 1,000 パスまで無料（アカウント全体）。タグ 1 つで 1 パス、`/*` も 1 パスと数える。
- 列車情報の書き込みは月 5〜123 件（本番 DB・2026-10-24）。改正の入力が入った月でも 123 件だ。
- 1 回の書き込みで捨てるタグは、ふつう 1 つ。だから、まとめずに書き込みのたびに捨てても、月 130 パス前後になる。client のデプロイの `/*` を足しても、無料枠の 1 割強だ。

### 2.4 描き直すときに古いものを読まないか

SSR の Lambda は API を `https://api.sotetsu-lab.com` で読む。時刻表の GET は `private, max-age=3600` を返すので、API の CloudFront（MinTTL 0）には置かれない。Node の `fetch` には HTTP キャッシュが無い。だから、失効したあとに描き直すときは、必ず DB の今の中身を読む。

## 3. 決めたこと

1. **書き込みが成功したら、応答を返す前に `CreateInvalidation` を呼ぶ。**
   - 書き込み直後に 1 回だけ呼び、まとめない（2026-10-27・ユーザー判断）。
   - spec 6.2 の「数分にまとめる」はやめる。2.3 の量なら無料枠に収まり、まとめると仕組みが増えるからだ。
2. **失効に失敗しても、書き込みは成功として返す。**
   - `socket-signal` と同じく、再試行はせず、接続 300ms・応答 1 秒で打ち切り、警告のログだけ残す。
   - api の Lambda の timeout は 3 秒なので、書き込みの応答が 504 にならないようにする。
3. **部品は `src/core/modules/cdn-invalidation/` に置く。**
   - Nest モジュールにして、`CdnInvalidation.invalidate({ tags })` を 1 つだけ出す。
   - 名前に Service を付けない。引数はオブジェクトにする。
   - タグの文字列を作る関数（`calendarCacheTag`・`sightingDateCacheTag`）もここに置き、client と同じ形にする。
4. **配信 ID は環境変数 `CDN_DISTRIBUTION_ID` で渡す。**
   - 値は `serverless.ts` で `${cf:sotetsu-lab-v3-${sls:stage}-client-cfstack.WebDistributionId}` から取る。
   - 空なら何もしない（テストと手元）。
   - IAM は、`cloudfront:CreateInvalidation` をその配信の ARN にだけ許す。
5. **SDK は `@aws-sdk/client-cloudfront` を足す。**
   - CloudFront の API は us-east-1 の 1 つの窓口だけなので、region は `us-east-1` に固定する。
   - `CallerReference` は、タグと時刻から作る。
6. **捨てるタグを決めるのはドメインではなく、書き込みの usecase。**
   - `trip-block.v3.service.ts` と `operation-sighting.v3.service.ts` などで、書いたあとに `socketSignal.send` と並べて呼ぶ。
   - 置き換え（PUT）のときは、書き換える前に calendarId を読んでおく。

## 4. 決めなかった案

- **失効を数分まとめる（spec 6.2 の書き方）。** まとめるには、DB の待ち表と cron、EventBridge Scheduler、SQS の遅延キューのどれかが新たに要る。2.3 の量では得るものが無いので、採らない（2026-10-27・ユーザー判断）。無料枠を超えそうになったら考え直す。

## 5. 2c より先に出すことの扱い

- 2c までは、本番の配信に `CacheTagConfig` が無い。それでもタグ（`#calendar:…`）の失効が受け付けられるかは、文書に書かれていない。
- 受け付けられなくても、3 章の 2 のとおりログが出るだけで、書き込みは成功する。
- 出したあとに、本番で 1 回、書き込みを通して確かめる。そのときに、CloudWatch のログに警告が無いことと、CloudFront の失効の一覧に `#calendar:<id>` が載ることを見る。
- 2c の stg の試し（2c の計画の Task 6 の試し 3）では、API から出した失効が stg の配信に効くかは試せない。API は本番の配信を見ているからだ。だから試し 3 では、タグの失効を手で流して効くことだけを確かめる。API と本番の配信をつないだ確かめは、2c を本番に出したあとに 1 回やる（2c の計画の Task 7）。

## 6. 確かめ方

- spec:
  - 各書き込みの usecase が、2.2 の表どおりのタグで `invalidate` を呼ぶこと。
  - 今日以降の目撃では呼ばないこと。
  - 失効が投げても書き込みの結果が返ること。
- `CdnInvalidation`:
  - `CDN_DISTRIBUTION_ID` が空なら SDK を呼ばないこと。
  - タグに `#` を付けて `Paths.Items` に入れること。
  - 重複を除くこと。
  - 例外を握りつぶして警告のログを出すこと。
- `serverless.ts` の設定（手元の `osls package` は S3 のレイヤーを上書きするので打たない。設定のオブジェクトを読んで確かめる）:
  - IAM がその配信の ARN だけに `cloudfront:CreateInvalidation` を許すこと。
  - 環境変数が入ること。
- 本番: 5 章のとおり。

## 7. やらないこと

- client の画面の変更（タグは 2a・2b で付け済み）。
- 温め（spec 6.4・リリース 4）。
- 書き込み以外の変化（改正の切り替わりの日など）への失効。日付の無い URL は短く置かれるので、要らない。
