# ADR-0012: 書き込みのたびに、画面の CDN キャッシュをタグで捨てる

- **日時**: 2026-10-27
- **Agent**: claude-sonnet-5-5
- **ステータス**: 採用済み（本番へのデプロイ前）
- **ブランチ**: feature/cdn-invalidation
- **spec**: docs/superpowers/specs/2026-10-27-cdn-invalidation-design.md

---

## 背景

- client の SSR（親の spec は client の `docs/superpowers/specs/2026-10-12-ssr-design.md`）を本番で有効にすると（2c）、時刻表・運用表などの HTML は CloudFront に最長 1 週間置かれる（`s-maxage=604800`）。
- 列車情報や目撃を書き込んでも、そのままでは SSR で初めて開いた人に最長 1 週間、古い画面が出る。だから、書き込んだ画面のキャッシュを api が捨てる必要がある（SSR のリリース 3）。
- client は、応答に `Cache-Control` と `Cache-Tag` を付けている。タグは小文字でカンマ区切り。
  - `calendar:<calendarId>`: 駅別時刻表・全線時刻表・運用表・行路図・ダイヤグラム。置く長さは 1 週間。
  - `sighting-date:<YYYY-MM-DD>`: 過去の運用情報。表示する日ごとに 1 つ。今日以降を含めば 1 分、過ぎた日だけなら 1 週間。

## 決定

- 書き込みが成功したら、応答を返す前に CloudFront の `CreateInvalidation` を 1 回呼ぶ。数分にまとめない（2026-10-27・ユーザー判断）。
  - 失効のパスには、タグの頭に `#` を付けたものを渡す（`#calendar:<id>`）。
  - 捨てるタグを決めるのは、ドメインでなく書き込みの usecase。`socketSignal.send` の隣で `cdnInvalidation.invalidate({ tags })` を呼ぶ。
    - trip-blocks の書き込み 4 本（bulk・PUT・add-trip・delete-trip）: 書いた列車の `calendar:<id>`（重複は除く）。PUT は書き換え前と後の両方。書き換える前に calendarId を読んでおく。
    - calendar-dates の追加・削除: その calendar の `calendar:<id>`。
    - 目撃の投稿・無効化・復元: 目撃の日（4 時区切り）が今日より前のときだけ `sighting-date:<日付>`。今日以降の画面は 1 分しか置かないので、捨てない。
- 失効に失敗しても、書き込みは成功として返す。
  - `socket-signal` と同じく、再試行はせず（`maxAttempts: 1`）、接続 300ms・応答 1 秒で打ち切り（`throwOnRequestTimeout: true`）、警告のログ（「CDN の失効に失敗しました」）だけ残す。
  - api の Lambda の timeout は 3 秒。詰まった失効が、書き込み済みの応答を 504 にしないようにする。
- 部品は `src/core/modules/cdn-invalidation/` の Nest モジュールにする（RBAC・socket-signal と同じ置き方・名前に Service を付けない）。
  - `CdnInvalidation.invalidate({ tags })` を 1 つだけ出す。
  - タグの文字列を作る関数（`calendarCacheTag`・`sightingDateCacheTag` など）も `cache-tags.ts` に置く。
  - SDK は `@aws-sdk/client-cloudfront`。CloudFront の API は us-east-1 の窓口だけなので、region は `us-east-1` に固定する。`CallerReference` はタグと時刻から作る。
- 配信の ID は環境変数 `CDN_DISTRIBUTION_ID` で渡す。空（手元・テスト）なら何もしない。
  - `serverless.ts` で、client のスタックの出力から取る。`${cf:sotetsu-lab-v3-${sls:stage}-client-cfstack.WebDistributionId}`。client のスタックは api と同じ ap-northeast-1 にあるので、リージョンの指定は要らない。
  - api の Lambda の IAM に、`cloudfront:CreateInvalidation` をその配信の ARN 1 つにだけ足した。

## 根拠

- 量が小さいので、まとめなくても無料枠に収まる。
  - 失効は月 1,000 パスまで無料（アカウント全体）。タグ 1 つで 1 パス。
  - 列車情報の書き込みは月 5〜123 件（本番 DB・2026-10-24）。改正の入力が入った月でも 123 件。
  - 1 回の書き込みで捨てるタグはふつう 1 つ。書き込みのたびに捨てても月 130 パス前後で、client のデプロイの `/*` を足しても無料枠の 1 割強。
  - 目撃は月 3,700 件ほどあるが、今日以降の目撃は捨てないので、無料枠に響かない。
- 描き直すときに古いものを読まない。SSR の Lambda は API を `https://api.sotetsu-lab.com` で読む。時刻表の GET は `private, max-age=3600`（ADR-0004）で、API の CloudFront には置かれず、Node の `fetch` に HTTP キャッシュは無い。失効のあとの描き直しは、必ず DB の今の中身を読む。
- タグを書き込みの usecase が決めるのは、何を書いたかを知っているのがそこだから。

## 却下した案

- 失効を数分まとめる（client の SSR の spec 6.2 の書き方）。
  - まとめるには、DB の待ち表と cron、EventBridge Scheduler、SQS の遅延キューのどれかが新たに要る。上の量では得るものが無いので採らない（2026-10-27・ユーザー判断）。無料枠を超えそうになったら考え直す。
- 失効の失敗を書き込みの失敗にする。失効が遅れても、画面が最長 1 週間古いだけで、書き込み自体は済んでいる。失敗を返すと、同じ書き込みの再送で二重に書かれるおそれもある。
- 書き込み以外の変化（改正の切り替わりの日など）への失効。日付の無い URL は短く置かれるので、要らない。

## 影響

- タグの形は client と対になっている。次の 2 つは client の `cache-control.ts` と同じでなければならず、片方だけ変えると失効が空振りする。
  - `calendar:<calendarId>` は全体を小文字にする。
  - `sighting-date:<YYYY-MM-DD>` の日付は 4 時区切りの運行日（api は `getBaseDate`、client は `getRailwayDate`）。
- 新しい書き込みの入口を足したら、捨てるタグも決める。決め忘れると、その画面だけ最長 1 週間古くなる。
- 出す順: client の 2c（SSR を本番で有効にする）より先に api を出す（2026-10-27・ユーザー判断）。
  - 2c までは、本番の配信にタグの設定（`CacheTagConfig`）が無い。その状態で `#calendar:…` の失効が受け付けられるかは、文書に書かれていないので未確認。
  - 受け付けられなくても、失効に失敗した警告のログが出るだけで、書き込みは成功する。
  - 出したあとに、本番で書き込みを 1 回通して確かめる。CloudWatch のログに警告が無いことと、CloudFront の失効の一覧に `#calendar:<id>` が載ることを見る。
  - 2c の stg の試しでは、API が出した失効が stg の配信に効くかは試せない（API は本番の配信を見ている）。stg では、タグの失効を手で流して効くことだけを確かめる。API と本番の配信をつないだ確かめは、2c を本番に出したあとに 1 回やる。
- デプロイでは、`serverless.ts` が client のスタックの出力 `WebDistributionId` を読む。client のスタックが無い stage では、デプロイが解決できずに落ちる。
- 確かめ方:
  - 各書き込みの usecase が、上の表どおりのタグで `invalidate` を呼ぶ・今日以降の目撃では呼ばない・失効が投げても書き込みの結果が返る（usecase のテスト）。
  - `CdnInvalidation` は、`CDN_DISTRIBUTION_ID` が空なら SDK を呼ばない・`#` を付けて重複を除く・例外を握りつぶして警告を出す（単体テスト）。
  - `serverless.ts` の IAM がその配信の ARN だけに `cloudfront:CreateInvalidation` を許し、環境変数が入ること（設定のオブジェクトを読んで確認する。手元の `osls package` は S3 のレイヤーを上書きするので打たない）。
  - 本番: 上の出す順のとおり。
