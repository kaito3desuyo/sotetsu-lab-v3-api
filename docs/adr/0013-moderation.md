# ADR-0013: 投稿の見回り（M18）— 手がかりの記録・BAN・まとめての無効化

- **日時**: 2026-11-03
- **Agent**: claude-sonnet-5-5
- **ステータス**: 採用済み（本番へのデプロイ前）
- **ブランチ**: feature/moderation
- **spec**: docs/superpowers/specs/2026-11-03-moderation-design.md
- **計画**: docs/superpowers/plans/2026-11-03-moderation.md

---

## 背景

- 2026-11-01〜02 にゲストの荒らしがあった。この 30 日の無効化・復元 491 件は、EDITOR 1 人が 1 件ずつ押して片付けた。
- 2026-11-06 21:00 に登録制②のフラグ（`registered_only_posting`・ADR-0009）を入れるとゲストの投稿は止まるが、荒らしがアカウントを作って入り直せば同じことが起きる。管理人が毎回 BAN するのは無理なので、任せた人が「前に止めた人と同じだ」と見抜いてその場で止められるようにする。
- `READER: 'reader'` は定義だけあって、api・client・DB のどこからも参照されていなかった（`profiles.role` に reader の行は 0・manager 1・editor 4・reporter 102。2026-11-03 実測）。

## 決定

- 役割は今の 4 つのまま。`READER: 'reader'` を `VIEWER: 'viewer'` に改める。
  - BAN ＝ `profiles.role` を `viewer` に格下げすること。BAN・解除・手がかりの閲覧は MANAGER だけ。
  - まとめての無効化と、投稿者の要約・目撃の一覧・新着は `@RBAC(EDITOR, MANAGER)`（RBAC は階層でなく列挙）。
- `RBACGuard` は `@RBAC` の付いた口で、役割を JWT でなく `profiles.role` から毎回読み直す（`src/core/modules/rbac/current-roles.ts`・キャッシュしない）。
  - 読み直した役割が `viewer` なら、フラグ `registered_only_posting` が off でも 403。BAN の直後（JWT はまだ `reporter`）でも止まる。
  - 匿名（役割なし）は `profiles` を持たないので読まない。行が無ければ JWT の値のまま。
- 手がかりは新しい表 `user_access_traces` に記録する。
  - 列は `id`・`user_id`（`auth.users(id)` への FK・CASCADE）・`kind`（`post`・`session`）・`ip`（inet・NOT NULL）・`user_agent`・`session_id`・`operation_sighting_id`（FK・SET NULL）・`created_at`。索引は `(user_id, created_at)`・`(ip)`・`(created_at)`、`(session_id, ip)` の一意。
  - `kind = 'post'` は目撃を保存するトランザクションの中で 1 行書く。
  - `kind = 'session'` は、登録者のトークンの `session_id` が、その Lambda の実体で初めて AuthGuard に来たときに書く（`INSERT … ON CONFLICT DO NOTHING`・`${sessionId}|${ip}` を Set に覚えて 2 回目から DB に行かない）。登録とログインのどちらも Supabase がセッションを作るので、この 1 種で両方を拾える。spec の `register`・`login` の 2 種は作らない。
  - IP は `CloudFront-Viewer-Address`（`ip:port`）の最後の `:` より前。IPv6 の `[…]` は外す。ヘッダーが無い（手元・テスト）か不正なら手がかりは書かず、投稿もログインもふつうに通る。
  - 記録の失敗は、AuthGuard の `session` では握って warn にとどめる。`post` はトランザクションの中なので、失敗すれば投稿もロールバックする。
- 手がかりは 90 日で消す。pg_cron は本番で未導入（`installed_version` が null・2026-11-03 確認）なので、api の中で消す。
  - Lambda の実体ごとに 1 時間に 1 回まで `created_at < now() - interval '90 days'` を消す（`purgeExpiredIfDue`）。失敗は warn で握る。
  - `recordPost` の中では消さない。トランザクション中に別接続の DELETE を待たないよう、消すのは投稿の commit の後（`session` の記録の後も同じ）。
  - 読む口も 90 日より古い行を返さない。
- 手がかりの読みは MANAGER だけの `GET /v3/moderation/users/:userId/traces`。IP・端末・回数と、同じ手がかりの他のアカウント（BAN 済みかも）を返す。
  - 同じ手がかりは IP の一致。IPv4 は完全一致、IPv6 は /64 で同じとみなす。UA は並べて見せるだけで、一致の条件にしない。
  - その IP を使ったアカウントが 10 以上なら `shared: true`（携帯回線などで弱めて出す）。
- BAN の記録は新しい表 `user_role_changes`（`id`・`user_id`・`changed_by`・`from_role`・`to_role`・`reason`・`created_at`）。
  - `POST /v3/moderation/users/:userId/ban`（理由必須）と `…/unban`。`profiles.role` の書き換えと記録は 1 つのトランザクション。
  - 自分・MANAGER・すでに viewer の人は BAN できない（`UseCaseError`・400 系）。
  - 解除は直近の BAN の `from_role` に戻し、記録が無ければ `reporter`。
  - BAN・解除は、`profiles` を `FOR UPDATE` で読んでから、直近の BAN を別の文で読む。同じ人への BAN・解除の同時実行で `from_role` が食い違わないようにする。
  - `changed_by` の FK は ON DELETE NO ACTION のまま。BAN の記録は監査のために残す。MANAGER を消すことはまず無く、消すときに先にその記録を消す手間が増えるだけ。
- まとめての無効化は `POST /v3/moderation/sightings/invalidate`（`ids`・`reason`）。1 件ずつの無効化を順に呼ぶ。
  - 繰り返しは `OperationSightingV3Service.invalidateMany` に置き、moderation の service は委ねるだけ。最新目撃のキャッシュの付け替えを、今の 1 件ずつの処理が正しく扱うので、それを使い回す。spec の「1 トランザクション」は取らない。
  - CDN の失効（日付を重複なく）と socket の合図は、1 件ごとでなく、最後に 1 回だけ出す。
  - api の Lambda の timeout は 3 秒。ループ開始から 1,500ms を超えたら、残りに手を付けず `pending`（id の配列）を応答に入れて返す。client は `pending` を送り直す。
  - すでに無効・存在しない id は `skipped`（id と `already_invalidated`・`not_found`）に入れて、残りは続ける。予期しない失敗は、その 1 件を `failed`（id とメッセージ）に入れてそこで止め、残りを `pending` に返す。成功は `invalidated`。
  - 1 回に受ける id は 200 件まで。201 件以上は 422（このリポの ValidationPipe は 422）。
  - すでに無効な目撃は、`invalidate` の中で `UseCaseError`（reason: `already_invalidated`）を投げる。今まではドメインが素の `Error` を投げていて、単体の無効化の口も 500 だった。それが UseCaseError の応答に変わる。
- 読み取りの口は `GET /v3/moderation/users/:userId`（要約）・`/users/:userId/sightings`・`/sightings/:id/author`・`/recent-sightings`（新着）。応答は保存させない（個人情報を含む）。
  - 新着には印を付ける。登録して 24 時間以内なら `newAccount`、その目撃までの 1 時間に同じ人の投稿が 5 件以上なら `burst`。
  - 印は投稿者の役割が `reporter`・`viewer` のときだけ計算し、`editor`・`manager` は両方 false。信頼済みの EDITOR の朝の投稿には `burst` がほぼ全件付き、印の意味が無くなるため（2026-11-02 の実データ）。
- BAN の後は socket の合図と CDN の失効を出さない。役割が変わるだけで、画面のデータは変わらない。
- ゲスト（匿名）は対象の外。`profiles` も `operation_sighting_authors` も持たない（本番 662 行すべて登録者）。見回りの一覧では投稿者の無い目撃を「ゲスト」と出す。
- backend は触らない。登録・ログインの手がかりは api が取る（spec の backend 分は不要）。

## 根拠

- `CloudFront-Viewer-Address` を信じてよい理由。
  - api の前の CloudFront（`serverless.ts` の `AppCloudFrontDistribution`）は origin request policy に Managed-AllViewerExceptHostHeader（`b689b0a8-…`）を使う。これは「all device type and viewer location headers」を origin に渡し、`CloudFront-Viewer-Address` はその 1 つ（AWS の「Add CloudFront request headers」「Use managed origin request policies」。2026-11-03 確認）。
  - Lambda の Function URL は `authorizer: 'aws_iam'`＋OAC なので、CloudFront を通らない呼び出しはできない。`CloudFront-*` のヘッダーは CloudFront が付け直すので、利用者は偽れない。`X-Forwarded-For` の先頭は偽れるので使わない。
  - Supabase の `auth.sessions` の IP は backend の Lambda の IP（AWS の IP）や `node` になっていて、手がかりに使えない（2026-11-03 確認）。だから backend に書かせず、api が自分の前で見えた IP を取る。
- 登録者のトークンの `session_id` で記録すれば、backend に書き込みの口（秘密の共有や service role）を足さずに済む。利用者が自分で叩ける「手がかりの書き込み口」を作らないので、偽の手がかりも書けない。
- 90 日の削除を api の中でやるのは、pg_cron が無く、定期 Lambda や CLI の毎日実行を足すほどの量でないから。投稿・ログインがあれば走り、無ければ溜まらない。読む口も 90 日で切るので、消し損ねても見えない。
- `recordPost` から削除を外したのは、投稿のトランザクションの中で別接続の DELETE を待つのが投稿の経路に悪いから。誤りでも、1 時間に 1 回の掃除が投稿で走らないだけで、`session` 側で走る。
- 一括を 1 件ずつの繰り返しにして、1,500ms の予算と `pending` を返すのは、Lambda の timeout が 3 秒で、200 件で 1 件ずつ合図すると CloudFront の失効と socket が 200 回ずつになるから。予算をループ開始から取り 2,000ms でなく 1,500ms にしたのは、最後の 1 件と最後の合図を 3 秒の内に残すため。途中で止まると部分的に無効になるが、応答の `invalidated`・`failed`・`pending` で画面が分かる。
- `profiles` を `FOR UPDATE` で読んでから直近の BAN を引くのは、同じ人を同時に BAN・解除したとき、先に書いた方の結果を後の方が読むようにするため。

## 却下した案

- 手がかりの書き込み口を api に足し、backend から叩く（SSM の秘密で守る・Supabase の service role で直接書く）。backend が持つ IP は AWS の IP なので、api で見えた IP を取る方が正しい。
- 手がかりを 1 日 1 回の定期 Lambda・CLI で消す。足すものが増えるだけで、量が小さい。
- `X-Forwarded-For` の先頭を IP とみなす。利用者が偽れる。
- UA だけで同じ人を見分ける。役に立たない。
- まとめての無効化を 1 トランザクションにする（spec）。最新目撃のキャッシュの付け替えを、1 件ずつの正しい処理から外して書き直すことになる。
- BAN の後に socket の合図と CDN の失効を出す（spec）。画面のデータが変わらない。
- 新しい役割（見回り専用など）を作る。ユーザー判断で、今の 4 つに収める。
- 自動で BAN・無効にする。判断は人がする。

## 影響

- migration は 2 本。流す順は次のとおり（`migration:run` はユーザーが本番に流す）。
  1. `1793639742858-AddUserAccessTraces`
  2. `1793642165620-AddUserRoleChanges`
- 出す順:
  1. client: プライバシーポリシー（#273 の取り込み直しと追記）。IP と端末の情報を 90 日持つことを書く。api より先に出ていること。
  2. api: migration 2 本 → api のデプロイ（記録・口・役割の確かめ）。
  3. client: 画面。
  - spec の「backend: 登録・ログインの手がかり」は不要になったので外した。
- 格上げ（片付けていた EDITOR を MANAGER にする）は、SQL で `profiles.role` を書き換える。この作業の外。
- `RBACGuard` が `@RBAC` の口のたびに `profiles` を 1 回引くようになった。`@RBAC` が付いているのは書き込みの口と見回りの口だけで、一般の読み取りの口には付いていない。
- `ModerationUserSummaryDto.banned` は、`user_role_changes` に BAN の記録があって今 viewer の人を指す。
- 手がかりの読みの SQL・新着の `CASE` の印は、本番の表が出来てから手元の API で確かめる。
- 確かめ方:
  - `CloudFront-Viewer-Address` が無いリクエストは手がかりを書かずに通る・IPv6 のポートを落とす（`viewer-address.spec.ts`）。
  - BAN の直後（JWT は `reporter`）の投稿は 403・フラグ off でも 403（`rbac.guard.spec.ts`）。
  - まとめての無効化で、すでに無効・存在しない id が `skipped` に入り残りは無効になる・201 件は 422。
  - 自分・MANAGER・すでに viewer の人の BAN は 400 系の `UseCaseError`。
- デプロイ後に本番で確かめること（ユーザーと一緒に）:
  1. client のプライバシーポリシー（#273＋追記）が先に出ていること。
  2. migration 2 本を、api のデプロイの前に `migration:run`（ユーザー）。
  3. デプロイ後、自分のアカウントでログインして 1 件投稿し、`user_access_traces` に `session` と `post` が 1 行ずつ入り、`ip` が自分の回線の IP（AWS の IP でない）であること。AWS の IP なら `CloudFront-Viewer-Address` が届いていない。その場合は記録を止めてユーザーに相談する（UA だけで出すことはしない）。
  4. 手がかりの SQL と新着の印を、手元の API から実表で 1 回叩く。
