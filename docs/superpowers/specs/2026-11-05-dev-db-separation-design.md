# M23 開発用 DB の分離 — 設計

日付: 2026-11-05。ユーザーと決めたこと（会話）と、私（Claude）の判断を分けて書く。私の判断には「（私の判断）」を付ける。

## 1. なぜ

手元の api（`.env.local`）・backend・socket は本番の Supabase（project `nofubcikiabamlnlxpko`）に直接つながっている。手元の画面で書き込むとそのまま本番に入るので、**書き込みを伴う試しが気軽にできない**（ユーザー）。M3 臨時列車・M17・M20 改正入力のように、ダイヤや運用をまとめて書き換える仕事の前提になる。

## 2. 目標・範囲外・やってはいけないこと

目標:

- 手元に Supabase（Postgres＋Auth）を **Supabase CLI** で docker に立て、手元の api・backend・socket の既定の接続先をそこにする（ユーザー選択の案 1）。
- 本番のデータを手元へ写す **スクリプトを 1 本**用意し、いつでも写し直せるようにする（ユーザー「スクリプトも用意しておきたい」）。
- 手元専用の試験アカウントでログインできるようにする。

範囲外:

- Supabase の branch・別プロジェクト（案 2・3。費用がかかるので退けた）。
- migration の仕組みを Supabase CLI の `supabase/migrations` へ乗り換えること。migration は今の TypeORM（`db/migrations`）のまま。
- 手元のスキーマは migration を空から流して作らない。**本番の `pg_dump --schema-only` を土台にする**（私の判断）。`db/migrations` は 2019 年の `CreateAllTables` から始まり途中が飛んでいて空から通る保証が無く、RLS は本番の `ensure_rls` イベントトリガー頼みで migration に書いていない（ADR-0013）。本番を写す方が「手元と本番の食い違い」を確実に消せる。写した後の `migrations` 表も本番と同じになるので、新しい migration は手元で `migration:run` してから本番へ、の順で試せる。
- CI で手元の Supabase を使うこと。
- 本番のアカウントで手元にログインすること（ユーザー了承済み: 手元では使えなくてよい）。

**やってはいけないこと（ユーザーが「困る」と言ったもの）:**

1. **手元のつもりで本番に書く事故（「ヤバい」）。** これを防ぐ仕掛けが、この仕事でいちばん大事。
2. **手元と本番で動きが食い違う（「割と困る」）。** 手元で通ったのに本番で落ちる。
3. **今の手順が面倒になる（「面倒」）。** `docker compose up` で api・backend・client が立つ流れを崩さない。

## 3. 今の姿（2026-11-05 に確かめた）

- api: `DATABASE_URL` は本番の pooler（`aws-0-ap-northeast-1.pooler.supabase.com:6543`）。`SUPABASE_URL` は本番。`AuthGuard` は `${SUPABASE_URL}/auth/v1` を issuer にし、その `/.well-known/jwks.json` で検証する（`src/core/modules/auth/auth.guard.ts`）。役割はトークンの `user_role` クレーム（Supabase の custom access token hook が入れる。`db/migrations/1793642165620-AddUserRoleChanges.ts` 付近）。
- api の環境変数は `.env.local`（`npm run dotenv` = `dotenvx run --env-file=.env.local`）。docker の api コンテナも `env_file: .env.local`。
- DB は Supabase Auth の `auth.users` を前提にしている（`profiles` の外部キー・auth.users への insert で profile を作るトリガー・匿名利用者を飛ばす分岐）。**素の Postgres では足りない。**
- backend: `.env` に本番 Supabase の URL・publishable key・secret key（キー名がハイフン区切り）。`signInWithPassword`・`signInAnonymously`・`admin.createUser`・`admin.signOut` を使う。手元では :3011。
- socket: `SUPABASE_URL` を読む（トークン検証）。
- 手元の docker に api 用の古い Postgres（`development-db`・:5432）がある。DB は 3 つ（`postgres`・`sotetsu_lab_v3_development`・`sotetsu_lab_v3_test`）、development は表 3 つで migration も無く、使われていない。
- 本番の DB は 354 MB。行の多い表は `times` 約 37 万・`operation_sightings` 約 31 万・`trips` 約 3.1 万。`auth.users` 4,026。
- 組織は Pro。branch は 0 本。
- Supabase CLI は手元に入っていない。

## 4. 形

### 4.1 手元の Supabase

- Supabase CLI で `supabase start`。設定（`supabase/config.toml`）は api のリポに置く（私の判断）。
- **CLI の版を固定する**（`package.json` の devDependencies に `supabase` を入れ、`npx supabase` で呼ぶ。私の判断）。手元の Postgres の主版は本番と同じ 15 にする（本番 15.6.1.141）。
- Auth の設定を本番に合わせる: 匿名ログイン有効・custom access token hook（`user_role` を入れる関数）・JWT の署名方式。本番の Auth の設定は着手時にダッシュボードか Management API で読む。
- ポートは CLI の既定（API :54321・DB :54322）。古い :5432 とはぶつからない。

### 4.2 接続先の切り替え

- **既定は手元。** api の `.env.local`・backend・socket の手元用の設定の既定を、手元の Supabase に向ける。コンテナからは `host.docker.internal:54321` / `:54322` で届く。
- 本番を見たいときは、明示の切り替えで向ける（例: 別の env ファイル `.env.local.prod` を選ぶ npm script。名前は着手時に決めてよい）。
- **本番に向けたときは接続を読み取り専用にする。** Postgres の `default_transaction_read_only=on` を接続のオプションで渡し（TypeORM の `extra` か接続文字列の `options`）、手元から本番への書き込みを DB が拒むようにする。これは「本番 DB を指していて、かつ本番の Lambda の上でない」ときに必ずかかるようにし、外す口は下の migration の 1 本だけにする。
  - **例外は本番への migration だけ（ユーザー決定 2026-11-05）。** 今はユーザーが手元から `.env.local` で本番へ `migration:run` を流している（ADR-0008・0009・0013）。これを専用の npm script 1 本（例 `migration:run:prod`）にし、本番へ書ける口はこれだけにする。流す前に接続先と、流す migration の一覧を出し、`yes` と打たせてから実行する。`migration:revert` を本番に流す口は作らない（私の判断。要るときは同じ形で足す）。CLI（`rebuild-latest-cache` など）を本番に流す口も今は作らない。
  - `NODE_ENV=production` を付けて手元から動かしても読み取り専用が外れないよう、判定は `NODE_ENV` でなく「Lambda の上で動いているか」（`AWS_LAMBDA_FUNCTION_NAME` の有無など）で行う（私の判断。着手時に本番の実行環境の変数を確かめて決めてよい）。
  - 本番の判定は接続先のホスト（`*.supabase.com` / `*.supabase.co` で、手元の Supabase でない）で行う。
- **起動時に接続先を見せる。** api は起動時に、DB の向き先（手元 / 本番）と読み取り専用かどうかをログに目立つ形で出す。
- DB 以外の外への書き込みも、手元の既定では手元に向けるか止める（私の判断）: socket への合図（`SOCKET_BROADCAST_*`）は手元の serverless-offline へ、CDN の失効（`CDN_DISTRIBUTION_ID`）は手元の既定では空にして呼ばない、backend は手元の Supabase Auth へ。使っていない `COGNITO_*` は手元の既定から外す。向き先の表示と食い違いの停止は api だけに入れ、backend・socket は設定を分けるだけにする。
- Auth も同じ向きにそろえる。DB は手元なのに Auth は本番、のような混ざった状態にならないよう、api は起動時に `DATABASE_URL` と `SUPABASE_URL` の向きが食い違っていたら起動を止める（私の判断）。

### 4.3 写し直しのスクリプト

- api のリポの `npm run` 1 本（名前は着手時に決めてよい。例 `db:copy-from-prod`）。
- 流れ:
  1. 本番から**読み取りだけ**で公共のデータを取り出す（`pg_dump --data-only` など。本番の接続はユーザーの手元の設定ファイルから読む。読み取り専用のトランザクションで）。
  2. 手元の DB を作り直す（`supabase db reset` 相当で空にし、本番の `pg_dump --schema-only` を入れる。対象は `public` と、`auth` などに本番が足した関数・トリガー・hook・イベントトリガー・grant。Supabase が自分で作る物と重なる所は着手時に実物で切り分ける）。
  3. 取り出したデータを入れる。
  4. 試験アカウントを作り直す（4.4）。
  5. スキーマの比べ（4.5）を流し、ずれていたら知らせる。
- **写すもの:** 時刻表・運用・編成・ダイヤ・駅・路線・会社などの公共の表は全部。目撃（`operation_sightings`）も写す。
- **写さないもの（個人に結びつくもの）:** `auth.*` の中身すべて・`profiles`・目撃の投稿者の記録（`operation_sighting_authors`）・投稿管理の記録（`operation_sighting_management_logs`）・役割の変更記録など、利用者の id・IP・メールを持つ表と列。目撃の表に利用者に結びつく列が残っていれば、写すときに落とすか空にする。
  - 一覧はコードとスキーマから作り、設計の付録としてスクリプトに書く（写さない表を足し忘れないよう、**写す表を列挙する方式**にする。私の判断）。
- `feature_flags`・`calendar_dates` など設定の性格を持つ公共の表も写す（私の判断。手元を本番と同じ挙動にする。手元で切り替えて試すのは写した後に手元の DB で書き換えればよい）。
- `pg_dump` / `psql` は手元の Supabase の DB コンテナの中のもの（本番と同じ主版）を使い、ホストに入れない（私の判断）。本番への接続は session mode（:5432）か直結で、pooler の transaction mode（:6543）は使わない。
- 本番の接続情報は、4.2 の「本番を見る」切り替えと同じファイルから読む。スクリプトの本番への接続も読み取り専用にかかる。
- ダンプの一時ファイルは `.context/` に置き、終わったら消す。
- かかる時間を測って手順書に書く（354 MB なら数分の見込みだが未測定）。

### 4.4 試験アカウント

- 役割ごとに 1 つ: reporter・editor・manager・viewer。ゲストは匿名ログインで足りる。
- 作り方は Auth の admin API か SQL（`auth.users` への insert で profile のトリガーが動くことも確かめる）。メールとパスワードは手元専用の固定値で、手順書に書く。

### 4.5 本番との食い違いを防ぐ

- 手元で migration を流した後のスキーマ（`public` と、関係する `auth` の関数・トリガー・hook・RLS・権限）を、本番と比べる。**差を 0 にしてから完了**とする。本番に migration の外で作ったもの（関数・トリガー・RLS・grant）があれば、migration に起こすか、手元の初期設定（seed や config）に足す。どちらにするかは見つかった物ごとに決める。
- この比べはスクリプトの最後にも入れ、ずれたら知らせる（止めはしない。私の判断）。

### 4.6 手順を崩さない

- `docker compose up`（api・backend・client）はそのまま。足すのは「最初に 1 回 `npx supabase start`」と写し直しの 1 本だけ。
- 古い `development-db`（:5432）は api の docker-compose から外す（私の判断）。ルートの `docker-compose.yaml`（Cognito 時代）は触らない。
- 手順書: api の `README` か `docs/` に「手元の開発環境」の節を書く。

## 5. 関わるリポ

- **api**: Supabase CLI の設定・切り替えと読み取り専用・起動時の表示と食い違いの停止・写し直しのスクリプト・試験アカウント・スキーマの比べ・docker-compose・手順書・ADR。
- **backend**: 手元用の設定を手元の Supabase に（URL・publishable key・secret key）。本番向けの設定は別に残す。
- **socket**: 手元用の `SUPABASE_URL` を手元に。
- client は変えない（backend と api の向きで決まる）。

決定は api の ADR に書く（各リポの決定はそのリポの ADR の原則で、backend・socket は設定の変更だけなので、必要なら短い ADR か README の追記）。

## 6. 着手時に確かめること（作る人に任せる）

- **JWT の issuer の食い違い。** 手元の Auth が出すトークンの `iss` は CLI の既定で `http://127.0.0.1:54321/auth/v1`。コンテナの api が `SUPABASE_URL=http://host.docker.internal:54321` だと、`AuthGuard` の issuer と合わない。issuer を設定で合わせる（`config.toml` の `jwt_issuer` など）か、api に「JWKS を取りに行く URL」と「期待する issuer」を別の変数で持たせるかを、実物で確かめて決める。
- 本番の Auth の設定（hook・匿名・署名方式・トークンの寿命）を読み、手元に写す方法。
- 手元から本番を読み取り専用で見る切り替えが、pooler（6543・transaction mode）で `default_transaction_read_only` を受け付けるか。受け付けなければ session mode（5432）か、接続直後の `SET` で代える。
- socket の手元の起動（serverless-offline・`dev:host`）が手元の Supabase で通るか。

## 6.1 確かめを誰が流すか

- docker・`supabase start`・SWC を使う migration や CLI は、Claude がサンドボックスの外で流してよい（私の判断）。
- 本番への接続は読み取りだけ。「本番に向けると書き込みが拒まれる」の実地の確かめは、行を変えない文（`UPDATE feature_flags SET ... WHERE false` など）で行い、拒まれることを見る。本番の行数の前後比べは Supabase MCP（読み取り）で。

## 7. 完了の条件

- 既定の設定のまま手元で目撃を投稿・時刻表を編集でき、本番の DB に何も入らないこと（本番の行数の前後で確かめる）。
- 本番に切り替えて書き込もうとすると、DB が拒むこと（実際に 1 回試す）。
- 起動時のログで向き先が分かること。DB と Auth の向きが食い違うと起動しないこと。
- 写し直しのスクリプトが通り、写さない表・列が手元に無いこと（SQL で確かめる）。かかった時間を記録。
- 試験アカウント 4 つでログインでき、役割どおりに通る・弾かれること。ゲストも。
- スキーマの比べが差 0。
- `docker compose up` からの手順が、足した 2 つ以外は今と同じ。
