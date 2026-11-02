# M18 投稿の見回り（api）

- **日時**: 2026-11-03
- **ブランチ**: feature/moderation（api・client・backend）
- **関わるリポ**: api（この文書・データと口）／client（画面。`docs/superpowers/specs/2026-11-03-moderation-design.md`）／backend（登録・ログインの手がかり。同名の spec）

## なぜ

2026-11-01〜02 にゲストの荒らしがあった（例: 11/01 13 時台はゲストの投稿 12 件中 11 件が無効化された）。この 30 日の無効化・復元 491 件は、EDITOR 1 人が 1 件ずつ押して片付けた。本人いわく「いたちごっこ」。

2026-11-06 21:00 に登録制②のフラグ（`registered_only_posting`）を入れ、ゲストの投稿は止まる。だが荒らしがアカウントを作って入り直せば同じことが起きる。管理人（ユーザー）が毎回 BAN するのは無理なので、Wikipedia の CheckUser のように、任せた人が「前に止めた人と同じだ」と見抜いてその場で止められるようにする。

## 目標

- EDITOR が、一人の投稿をまとめて無効にできる。
- MANAGER が、アカウントを BAN でき、解ける。
- MANAGER が、投稿・登録・ログインのときの IP アドレスと端末の情報（手がかり）を見て、同じ手がかりの他のアカウントを見つけられる。
- 荒らしを、見つけたその場（過去の運用表）からも、探しに行く一覧（見回り）からも追える（画面は client の spec）。

## 目標でないこと

- 自動で BAN・自動で無効にすること。判断は人がする。
- 新しい役割を作ること（ユーザー判断:「現行の役割に含められないか」）。
- 閲覧を止めること。BAN しても見るのはできる。
- 投稿者の名前を一般の利用者に見せること（2026-10-19 の決まり「投稿者名は画面に出さない」。EDITOR 以上にだけ見せる）。

## やってはいけないこと（失敗の形）

- BAN したのに、トークンが切れるまでの最長 1 時間は投稿できてしまう。
- 手がかり（IP アドレス）が MANAGER 以外に見える・90 日を過ぎても残る。
- backend の Lambda の IP（AWS の IP）や `node` を手がかりとして記録する（Supabase の `auth.sessions` は実際にそうなっていて使えない。2026-11-03 確認）。

## 決めたこと（ユーザー判断）

- **役割は今の 4 つのまま。**
  - 使われていない `READER: 'reader'`（`src/core/modules/rbac/role.enum.ts` に定義だけある。api・client・DB のどこからも参照されていない。2026-11-03 確認）を `VIEWER: 'viewer'` に改める（ユーザー「READER って英語的に微妙」）。
  - **BAN = `profiles.role` を `viewer` に格下げすること**（ユーザー「VIEWER への格下げという意味になるかな」）。
  - BAN と BAN の解除は **MANAGER だけ**。片付けていた EDITOR を MANAGER に格上げする前提（格上げは SQL で `profiles.role` を書き換える。この作業の外）。今の api に MANAGER だけの操作は 0 件なので、格上げで渡るのは BAN と手がかりだけ。
  - 一人の投稿をまとめて無効にするのは **EDITOR 以上**（今の 1 件ずつの無効化・復元と同じ）。
- **手がかりを見られるのは MANAGER だけ。**
- **手がかりは 90 日で消す**（Wikipedia の CheckUser に倣う）。
- **画面からできるようにする**（ユーザー「できたほうがいい」）。入口は過去の運用表と、新しい見回りの一覧の両方。

## 作るもの

### 1. 手がかりの記録

- 新しい表（名前は builder。例 `user_access_traces`）: `id`、`user_id`（`auth.users(id)` への FK・ON DELETE CASCADE）、`kind`（`post`・`register`・`login`）、`ip`（inet）、`user_agent`（text）、`operation_sighting_id`（`post` のときだけ・FK・ON DELETE SET NULL）、`created_at`。
  - GTFS のメインテーブル・`operation_sightings` には列を足さない（派生はサブテーブルに置く決まり）。
  - 制約名は既定のハッシュ名。migration は `migration:generate`。
- api は目撃を保存するトランザクションの中で `kind = 'post'` を 1 行書く。
- `register`・`login` は backend が書く（backend の spec）。backend は DB に直接つながない作りなので、書き込みの口は api に足す（下の「口」を参照）。
- **本当の利用者の IP の取り方は builder が確かめる。** api の前には CloudFront → API Gateway → Lambda がある。`X-Forwarded-For` の先頭は利用者が偽れる。CloudFront の `CloudFront-Viewer-Address` を origin に渡す設定があるか、API Gateway の `requestContext.identity.sourceIp` が何になるかを本番に近い所で実測して決め、ADR に書く。
- **90 日で消す。** 消し方（pg_cron・api の定期 Lambda・CLI を毎日など）は builder。どれにしたかと、消えていることの確かめ方を ADR に書く。

### 2. 投稿のときの役割の確かめ

- `POST /v3/operation-sightings` は、JWT の `user_role` に加えて、**その場で `profiles.role` を読み**、`viewer` なら 403 にする。
  - フラグ `registered_only_posting` が off のときの扱い（ゲストを通している間）に、BAN された人だけは止める。
- 他の書き込み口（trip-blocks・無効化・復元）は EDITOR 以上なので、BAN（viewer）とは関係しない。ただし MANAGER・EDITOR を格下げしたときに 1 時間残るのは同じなので、同じ確かめを掛けるかは builder（安く掛けられるなら掛ける）。

### 3. BAN の記録

- 新しい表（例 `user_role_changes`）: `id`、`user_id`（対象）、`changed_by`（MANAGER の `auth.users(id)`）、`from_role`、`to_role`、`reason`（BAN のときは必須）、`created_at`。
- BAN の解除は、直近の BAN の `from_role` に戻す。
- `profiles.role` の書き換えと記録は 1 つのトランザクション。

### 4. 口（すべて v3・`createQueryBuilder` で）

| 口 | 権限 | 中身 |
|---|---|---|
| 投稿者の要約（id で） | EDITOR 以上 | ユーザー名・表示名・役割・登録日時・投稿数・無効数・最初と最後の投稿 |
| 投稿者の目撃の一覧 | EDITOR 以上 | 新しい順・無効かどうかと誰が無効にしたか |
| 目撃のまとめての無効化 | EDITOR 以上 | id の配列。1 トランザクション。管理の記録（`operation_sighting_management_logs`）も 1 件ずつ |
| 新着の目撃の一覧（見回り） | EDITOR 以上 | 投稿者つき。印「登録して N 時間以内」「1 時間に N 件以上」 |
| BAN・解除 | MANAGER | 理由つき |
| 手がかり | MANAGER | IP・端末・回数・同じ IP の他のアカウント（BAN 済みかも） |
| 手がかりの書き込み（backend から） | backend だけ | 下の注意 |

- 目撃の一覧の 1 件から投稿者に行けるよう、EDITOR 以上には目撃の応答に投稿者の id を付ける（それ以外の人には出さない）。過去の運用表の口に足すか、別の口にするかは builder。
- まとめての無効化・BAN の後は、今の無効化と同じく socket の合図（`{"type":"sighting"}`）と CDN の失効（ADR-0012）を出す。
- **backend からの手がかりの書き込み**: 利用者が自分で叩ける口にしてはいけない（偽の手がかりを書ける）。backend だけが持つ秘密（SSM）で守るか、backend が Supabase の service role で直接書くかは builder が比べて決め、ADR に書く。backend の spec と合わせること。
- 印の閾値（N 時間・N 件）は builder の判断（私の案: 登録 24 時間以内・1 時間に 5 件以上）。

### 5. 読み手の確認で決めたこと（2026-11-03）

- **ゲスト（匿名）は対象の外。** 匿名には `profiles` の行が無く（ADR-0005）、`operation_sighting_authors` にも匿名の行は 0 件（本番 662 行すべて登録者・2026-11-03 確認）。2026-11-06 21:00 からゲストは投稿できない。だから投稿者のページと BAN は登録者だけ。見回りの一覧では、投稿者の無い目撃は「ゲスト」と出し、投稿者のページへは行けない（1 件ずつの無効化は今までどおり）。
- **IP が信頼できる形で取れないとき（私の判断）。** CloudFront・API Gateway の設定を変えて取れるなら、その変更もこの作業に含める（client のスタックの CloudFront を触るなら client の ADR にも書く）。それでも取れなければ、手がかりの記録は入れずに止め、ユーザーに相談する。UA だけで出すことはしない（同じ人を見分ける役に立たない）。
- **「同じ手がかり」は IP の一致（私の判断）。** IPv4 は完全一致、IPv6 は /64 の一致。携帯回線などで多くのアカウントが同じ IP を使うことがあるので、手がかりの表には「その IP を使ったアカウントの数」を出し、多いもの（目安 10 以上）は弱めて出す。UA は並べて見せるだけで、一致の条件にしない。
- **BAN できる相手（私の判断）。** 自分と MANAGER は BAN できない。EDITOR と REPORTER はできる。解除は直近の BAN の `from_role` に戻し、BAN の記録が無い `viewer` は `reporter` に戻す。

## プライバシー

- IP アドレスと端末の情報を、投稿・登録・ログインのときに 90 日持つことを、client のプライバシーポリシー（M26・client PR #273）に書く。**api のデプロイより先に、ポリシーが出ていること。**

## 出す順（案）

1. client: プライバシーポリシー（#273 の取り込み直しと追記）
2. api: migration → api（記録・口・役割の確かめ）
3. backend: 登録・ログインの手がかり
4. client: 画面

## builder に任せること

- 表と列の名前、口のパスと形、閾値、消し方、IP の取り方（実測して ADR）、backend の書き込み方（ADR）。
- ADR を 1 本（`docs/adr/0013-moderation.md`）。
