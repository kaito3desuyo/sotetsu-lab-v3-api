# M23 開発用 DB の分離 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **この計画書は、書いた後で設計が変わった。** 「本番に向けたら読み取り専用で立てる」は取り下げ、手元の api は本番の DB に一切つながない（本番へ書けるのは `migration:run:prod` だけ）に改めた。2026-11-05 に本番の pooler（Supavisor）が接続の `options` を捨て、接続直後の `SET` が共有の裏 backend に残る事故があったため。読み取り専用・`start:dev:prod`・`PGOPTIONS`・`UPDATE ... WHERE false`・`ReadOnlyClient` に関する記述は古い。今の形は spec（`docs/superpowers/specs/2026-11-05-dev-db-separation-design.md` §4.2・§4.3・§7）と `docs/adr/0015-dev-db-separation.md` を見ること。試験アカウントの値も変えた（下の Global Constraints）。

**Goal:** 手元の api・backend・socket の既定の接続先を Supabase CLI で立てた手元の Supabase にし、手元の api は本番につながない（起動を止める。本番へ書けるのは `migration:run:prod` だけ）ようにし、本番から公共のデータを写し直すスクリプトを用意する。

**Architecture:** api に「接続先の判定」の小さな部品を置き、DataSource の設定・起動時のログ・食い違いの停止はそれを読む。本番へ書けるのは `migration:run:prod` だけ。手元の Supabase は api のリポの `supabase/config.toml` で立て、スキーマは本番の `pg_dump --schema-only`、データは写す表を列挙した bash スクリプトで入れる。

**Tech Stack:** NestJS 12・TypeORM 1.x・vitest・Supabase CLI（npm の `supabase`）・bash・docker。

**Spec:** `docs/superpowers/specs/2026-11-05-dev-db-separation-design.md`（e4170ab）

## Global Constraints

- 本番 project ref: `nofubcikiabamlnlxpko`。本番の Postgres は 15（15.6.1.141）。手元も主版 15。
- 本番の判定は接続先のホストが `*.supabase.com` / `*.supabase.co`。
- 本番の Lambda の判定は `AWS_LAMBDA_FUNCTION_NAME` があること（Task 1 で本番の実行環境の変数を `serverless.ts` から確かめ、違えば直してよい）。
- 本番の DB を向いて Lambda の外で動くときは、api・CLI・TypeORM の CLI は起動を止める（`assertNotProdOutsideLambda`）。外せるのは `migration:run:prod`（script の中だけが `SOTETSU_PROD_MIGRATION=confirmed` を付ける）だけ。（旧: 接続に `default_transaction_read_only=on` — 置き換え済み: spec §4.2・§4.3・§7（7f17e3c）と ADR-0015）
- 手元の Supabase のポートは CLI の既定（API 54321・DB 54322）。コンテナからは `host.docker.internal`。
- env ファイル: `.env.local` = 手元（既定）、`.env.local.prod` = 本番（写し直しと migration の script だけが読む。手元の api はこの値で起動しない）。どちらも `.gitignore` の `.env.*` で除外済み。見本は `.env.local.example` / `.env.local.prod.example`（秘密の値は書かない）。
- 写す表（これ以外は写さない）: `agencies calendar_dates calendars feature_flags formations migrations operating_systems operation_sighting_invalidations operation_sighting_latest_caches operation_sightings operations route_station_lists routes services stations stops times trip_blocks trip_classes trip_operation_lists trips vehicle_formations vehicles`
- 写さない表: `profiles operation_sighting_authors operation_sighting_management_logs user_access_traces user_role_changes m6_fix_20261024`、`auth`・`storage` などの中身すべて。
- 本番の Auth の hook: `public.custom_access_token_hook`（`user_role`・`display_name` を入れる）・`public.before_user_created_hook`。役割の実体は `profiles` の役割の列。本番のイベントトリガー `ensure_rls`（関数 `public.rls_auto_enable`）。
- 試験アカウントは 4 つ: reporter・editor・manager・viewer（ユーザー名 `dev-<role>`・メール `dev-<role>@users.sotetsu-lab.invalid`・パスワード `Dev-password1!`）。ゲストは匿名ログイン。（旧: `dev-<role>@example.test` / `dev-password` — backend のログインの決まりに合わせて変えた。ADR-0015）
- コミットは Conventional Commits＋絵文字（`feat: :sparkles:` 等）、署名付き（`git commit` はサンドボックス外）。末尾に `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` と `Claude-Session: https://claude.ai/code/session_01FZB1eB3dTj4GQVxda71thf`。push しない。
- 秘密の値（鍵・パスワード・接続文字列）をログ・コミット・報告に出さない。env を表示するときは値を伏せる。
- 本番 DB への書き込みは一切しない。本番に書き込みを試す確かめもしない（旧: `UPDATE ... WHERE false` が拒まれることを見る — 置き換え済み: spec §4.2・§4.3・§7（7f17e3c）と ADR-0015）。本番へ流すのは `BEGIN READ ONLY` で包んだ問い合わせと `pg_dump` だけ。`SET`・`PGOPTIONS` は本番の pooler に送らない。

## Review Focus

1. `.env.local` が古いまま本番を向いている人が新しいコードで起動する → 起動を止める（旧: 読み取り専用で立つ — 置き換え済み: spec §4.2・§4.3・§7（7f17e3c）と ADR-0015）。
2. `DATABASE_URL` は手元・`SUPABASE_URL` は本番（またはその逆）→ 起動を止め、どちらを直すかを言う（Task 1）。
3. （取り下げ）pooler が接続の `options` を受け付けない件。実際に `options` は捨てられ、接続直後の `SET` は共有の裏 backend に残る事故になった。読み取り専用の仕組みごと外した（置き換え済み: spec §4.2・§4.3・§7（7f17e3c）と ADR-0015）。
4. 写し直しの途中で失敗（本番に届かない・docker が止まっている）→ 手元の DB を空のまま残さない。ダンプを取り終えてから手元を作り直す順にする（Task 4）。
5. 新しく公共の表が増えたのに写す表の一覧に無い → スクリプトの最後に、本番の `public` の表のうち「写す」「写さない」のどちらにも無い表を列挙して知らせる（Task 4）。

---

### Task 1: 接続先の判定と読み取り専用

> **置き換え済み**（spec §4.2・§4.3・§7（7f17e3c）と ADR-0015）: `readOnly`・`readOnlyConnectionExtra`・`ReadOnlyClient` は無い。`resolveDatabaseTarget` は `{ db, auth }` だけを返し、本番かつ Lambda の外（`SOTETSU_PROD_MIGRATION=confirmed` でない）なら `assertNotProdOutsideLambda` が `createApp`・`cli.ts`・`data-source.ts`・`database.config.ts` で起動を止める。起動ログは `DB: 手元 / Auth: 手元`（本番のときは「（読み取り専用）」を付けない）。以下の Interfaces・Step は書いた当時のまま。

**Files:**
- Create: `src/core/configs/database-target.ts`
- Create: `src/core/configs/database-target.spec.ts`
- Modify: `src/core/configs/database.config.ts`
- Modify: `src/app.ts`（起動時のログと停止）、`src/cli.ts`、`src/core/utils/data-source.ts`（同じログ）

**Interfaces:**
- Produces:
  - `type DbTarget = 'local' | 'production'`
  - `classifyUrl(url: string | undefined): DbTarget` — ホストで判定。未設定・解釈できない値は `'local'` ではなく例外（`Error('DATABASE_URL が無い')` 等）。
  - `isOnLambda(env: NodeJS.ProcessEnv): boolean`
  - `resolveDatabaseTarget(env: NodeJS.ProcessEnv): { db: DbTarget; auth: DbTarget; readOnly: boolean }` — `readOnly = db === 'production' && !isOnLambda(env) && env.SOTETSU_PROD_MIGRATION !== 'confirmed'`
  - `assertTargetsAgree(t): void` — `db !== auth` なら例外。メッセージに両方の向き先を含める。
  - `describeDatabaseTarget(t): string` — 例 `DB: 本番（読み取り専用） / Auth: 本番`、`DB: 手元 / Auth: 手元`
  - `readOnlyConnectionExtra(t): Record<string, unknown>` — readOnly なら `{ options: '-c default_transaction_read_only=on' }`、そうでなければ `{}`

- [ ] **Step 1: spec を書く**（`database-target.spec.ts`）。少なくとも次を it にする:
  - `classifyUrl('postgresql://u:p@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres')` → `'production'`、`'https://nofubcikiabamlnlxpko.supabase.co'` → `'production'`、`'postgresql://postgres:postgres@host.docker.internal:54322/postgres'` → `'local'`、`'http://127.0.0.1:54321'` → `'local'`、`undefined` → throw
  - 本番 DB・Lambda 外 → `readOnly: true`。本番 DB・`AWS_LAMBDA_FUNCTION_NAME` あり → `false`。本番 DB・`SOTETSU_PROD_MIGRATION=confirmed` → `false`。手元 → `false`。`NODE_ENV=production` を付けても Lambda 外なら `true`
  - `assertTargetsAgree({db:'local', auth:'production'})` は throw、同じなら何もしない
  - `readOnlyConnectionExtra` の 2 通り
- [ ] **Step 2:** `npx vitest run src/core/configs/database-target.spec.ts` が失敗することを見る（サンドボックス外。SWC のため）
- [ ] **Step 3:** 実装。`database.config.ts` の `extra` に `...readOnlyConnectionExtra(resolveDatabaseTarget(process.env))` を混ぜる（`max`・`idleTimeoutMillis` は残す）
- [ ] **Step 4:** `createApp()` の最初で `resolveDatabaseTarget` → `assertTargetsAgree` → `Logger.warn(describeDatabaseTarget(...))`（本番のときは warn、手元は log）。Lambda の上（本番の通常運用）では止めない・本番のログを汚さないよう 1 行だけ。`cli.ts` と `data-source.ts` も同じ 1 行を出す（`data-source.ts` は `console.warn` でよい）
- [ ] **Step 5:** `npx vitest run src/core/configs` と `npx tsc --noEmit -p tsconfig.json` と `npm run lint` が通る
- [ ] **Step 6: コミット** `feat: :sparkles: 本番 DB へは Lambda の外から読み取り専用でつなぐ`

### Task 2: 本番への migration の専用口と env の分け方

**Files:**
- Create: `db/scripts/migration-run-prod.sh`
- Create: `.env.local.example`、`.env.local.prod.example`
- Modify: `package.json`（scripts）

**Interfaces:**
- Consumes: Task 1 の `SOTETSU_PROD_MIGRATION=confirmed`
- Produces: npm scripts `dotenv:prod`（`dotenvx run --env-file=.env.local.prod --`）・`migration:show:prod`・`migration:run:prod`（~~`start:dev:prod`~~ は削除した — 置き換え済み: spec §4.2・§4.3・§7（7f17e3c）と ADR-0015。`migration:show:prod` は `migration-run-prod.sh --show`）

- [ ] **Step 1:** `migration-run-prod.sh`: `.env.local.prod` を読み、接続先のホスト（パスワードは伏せる）と `typeorm migration:show` の未適用の一覧を出し、`yes` と打たれたときだけ `SOTETSU_PROD_MIGRATION=confirmed` を付けて `migration:run` を流す。`yes` 以外・未適用 0 件なら何もせず終わる。`set -euo pipefail`
- [ ] **Step 2:** 見本の env 2 つ（変数名と説明だけ。値は `<...>`）。`.env.local.example` は手元の Supabase の値（CLI の既定の値は秘密ではないので書いてよい）、socket・CDN の扱い（`CDN_DISTRIBUTION_ID` は空、`SOCKET_BROADCAST_*` は手元の serverless-offline）、`COGNITO_*` は無し
- [ ] **Step 3:** 確かめ: `.env.local.prod` を作り（今の `.env.local` を写す）、`npm run migration:show:prod` が本番の一覧を出す（読み取りだけ）。`migration:run:prod` に `no` と答えて何も流れないこと。**`yes` は打たない**
- [ ] **Step 4: コミット** `feat: :sparkles: 本番への migration を確認つきの専用の口にする`

### Task 3: 手元の Supabase を立てる

**Files:**
- Create: `supabase/config.toml`（`npx supabase init` で作り、下を直す）
- Modify: `package.json`（devDependencies に `supabase` を版固定・scripts `supabase:start`・`supabase:stop`）
- Modify: `docker-compose.yml`（`development-db` を外す・api に `extra_hosts: ["host.docker.internal:host-gateway"]`）
- Modify: `src/core/modules/auth/auth.guard.ts`（issuer の食い違いが出た場合のみ。下の Step 4）

- [ ] **Step 1:** `config.toml`: `[db] major_version = 15`・匿名ログイン有効・`[auth.hook.custom_access_token]` を `pg-functions://postgres/public/custom_access_token_hook`、`[auth.hook.before_user_created]` を `pg-functions://postgres/public/before_user_created_hook`・JWT の署名方式は本番に合わせる（本番の設定を Supabase MCP か Management API で読み取り、同じにする。読めなければ ledger に書いて非対称鍵を既定に）。使わないサービス（storage・realtime・studio 以外の不要なもの）は止めてよい
- [ ] **Step 2:** `npx supabase start` が通り、`npx supabase status` で API・DB の URL と鍵が出る（サンドボックス外）
- [ ] **Step 3:** 手元の `.env.local` を手元の Supabase に向ける（`DATABASE_URL=postgresql://postgres:postgres@host.docker.internal:54322/postgres`・`SUPABASE_URL=http://host.docker.internal:54321` など）。この時点では DB は空でよい
- [ ] **Step 4:** issuer の確かめ: 手元の Auth で匿名ログインしたトークンの `iss` を見る。`AuthGuard` の期待（`${SUPABASE_URL}/auth/v1`）と食い違うなら、`SUPABASE_JWT_ISSUER`（未設定なら今どおり `${SUPABASE_URL}/auth/v1`）を足して issuer と JWKS の URL を分ける。足すなら `auth.guard` の spec に「`SUPABASE_JWT_ISSUER` があればそれを期待する」を足す（TDD）。どちらにしたかを報告に書く
- [ ] **Step 5:** `docker compose up -d` で api が立ち、起動ログが `DB: 手元 / Auth: 手元`
- [ ] **Step 6: コミット** `build: :wrench: 手元に Supabase を立てる設定を足す`（auth.guard を変えたら別に `feat: :sparkles: JWT の発行元を設定で与えられるようにする`）

### Task 4: 写し直しのスクリプト・試験アカウント・スキーマの比べ

**Files:**
- Create: `db/scripts/copy-from-prod.sh`（本体）
- Create: `db/scripts/copy-from-prod.tables.txt`（写す表・写さない表の一覧。Global Constraints のとおり）
- Create: `db/scripts/seed-dev-accounts.sql`
- Create: `db/scripts/compare-schema.sh`
- Modify: `package.json`（`db:copy-from-prod`・`db:compare-schema`）

**Interfaces:**
- Consumes: Task 2 の `.env.local.prod`、Task 3 の手元の Supabase（DB コンテナ名は `npx supabase status` か `docker ps` で引く）

- [ ] **Step 1:** `copy-from-prod.sh` の順:
  1. 本番から取り出す（手元の Supabase の DB コンテナの中の `pg_dump` を使う。本番へは session mode か直結。~~`PGOPTIONS`~~ は使わない。`pg_dump` は自分で読み取り専用のトランザクションを張り、`psql` は `BEGIN READ ONLY; ...; COMMIT;` で包む — 置き換え済み: spec §4.2・§4.3・§7（7f17e3c）と ADR-0015）: `--schema-only`（`public` と、本番が `auth` に足した物があればそれ。Supabase が自分で作る物と重なる所は除く）と、写す表だけの `--data-only`。一時ファイルは `.context/`
  2. **取り出しが全部済んでから**手元を作り直す（`npx supabase db reset` で空に → スキーマを入れる → データを入れる。外部キーの順は `--disable-triggers` か依存順で）
  3. `seed-dev-accounts.sql` を流す（4 つの試験アカウントを `auth.users` に作り、`create_profile_on_auth_user_insert` で profile ができること、役割の列をそれぞれに設定）。パスワードは `crypt('Dev-password1!', gen_salt('bf'))`（旧: `dev-password`）
  4. 本番の `public` の表のうち、一覧のどちらにも無い表を列挙して知らせる
  5. `compare-schema.sh` を流す
  6. 一時ファイルを消し、かかった秒数を出す
- [ ] **Step 2:** `compare-schema.sh`: 本番と手元の `public` の `pg_dump --schema-only`（owner・privileges の差を消す正規化をしてから）と、hook 関数・イベントトリガーの有無を比べ、差を出す。差が 0 なら `スキーマの差 0`。差があっても止めない（終了コード 0、出力で知らせる）
- [ ] **Step 3:** 流して確かめる（サンドボックス外）:
  - 写さない表が手元で空（`profiles` は試験アカウントの 4 行だけ）、`operation_sightings` の行数が本番と同じ（Supabase MCP で本番を数える）
  - スキーマの差が 0。0 でなければ、差の 1 つずつを「migration に起こす / config・seed に足す」のどちらにしたかを ledger に書いて直す（本番には何も流さない。migration に起こす物は新しい migration ファイルにしてユーザーの `migration:run:prod` に回す旨を報告に書く）
  - かかった時間を記録
- [ ] **Step 4:** （**取り下げ・実施しない**。置き換え済み: spec §4.2・§4.3・§7（7f17e3c）と ADR-0015。本番に書き込みを試す確かめはしない。下は書いた当時の記述）本番への書き込みが拒まれることの実地: `.env.local.prod` の接続（Task 1 の組み立てと同じ `options` 付き。pooler 6543 も試す）で `UPDATE feature_flags SET enabled = enabled WHERE false` を投げ、`cannot execute UPDATE in a read-only transaction` で拒まれること。6543 で options が効かないなら、Task 1 の組み立てを「接続直後の `SET default_transaction_read_only = on`」（TypeORM の接続後フックか `pg` の `connect` イベント）に変えて spec も直す
- [ ] **Step 5: コミット** `feat: :sparkles: 本番から公共のデータを手元へ写し直すスクリプトを足す`

### Task 5: backend と socket を手元の Supabase へ

別リポ。それぞれ master から作業ブランチ `chore/dev-db-separation` を切り、`first commit`（空・署名）を置いてから。

**Files（backend `../sotetsu-lab-v3-backend`）:** `serverless.ts` の env の読み方（offline は `.env.local`）を読んで、手元の Supabase の URL・publishable key・secret key（`npx supabase status` の値）を手元の設定に入れる。本番向けの値は本番の設定（`.env.prod` 等）にだけ残す。見本 `.env.local.example` を足す（値は伏せる）。
**Files（socket `../sotetsu-lab-v3-socket`）:** 手元の `.env.local` の `SUPABASE_URL` を手元に。見本を直す。

- [ ] **Step 1:** backend: docker の backend（:3011）から手元の Supabase に届くこと（`host.docker.internal` と `extra_hosts`）。試験アカウントで `signInWithPassword` が通り、ゲストの `signInAnonymously` が通る
- [ ] **Step 2:** socket: 手元の起動（`npm run dev:host`）が手元のトークンを受け付ける
- [ ] **Step 3:** 各リポでコミット `build: :wrench: 手元の接続先を手元の Supabase にする`（env ファイル自体は git 管理外なので、コミットするのは見本・README・必要ならコード）

### Task 6: 手順書・ADR・通しの確かめ

**Files:**
- Modify: `README.md`（「手元の開発環境」の節: 初回 `npm run supabase:start` → `npm run db:copy-from-prod` → `docker compose up`、本番への migration、試験アカウント、かかる時間。「本番を見る切り替え」は無くなった）
- Create: `docs/adr/0015-dev-db-separation.md`

- [ ] **Step 1:** 手順書と ADR（spec の決定・ユーザー決定と私の判断の区別・Task 3 の issuer の結論・Task 4 のスキーマの差の扱い）
- [ ] **Step 2:** spec の「完了の条件」をすべて実地で確かめ、結果を報告に書く:
  - 既定のまま client（:4200）から試験アカウントで目撃を投稿・時刻表を編集でき、本番の `operation_sightings` の行数・最新の `created_at` が前後で変わらない（Supabase MCP）
  - `.env.local.prod` の値で起動しようとすると、接続の前に起動が止まる（旧: 起動ログ `DB: 本番（読み取り専用） / Auth: 本番` で書き込みが拒まれる、`UPDATE ... WHERE false` — spec §7 に従う）
  - `DATABASE_URL` と `SUPABASE_URL` の向きを食い違わせると起動しない
  - 試験アカウント 4 つとゲストで、役割どおりに通る・弾かれる（例: viewer は投稿 403、editor は時刻表の編集が通る、reporter は通らない）
  - スキーマの差 0
  - `docker compose up` からの手順が、足した 2 つ以外は今と同じ
- [ ] **Step 3: コミット** `docs: :memo: 手元の開発環境の手順と ADR-0015 を書く`
