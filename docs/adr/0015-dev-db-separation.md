# ADR-0015: 開発用 DB の分離（M23）— 手元は手元の Supabase、本番へは migration の口だけ

- **日時**: 2026-11-05
- **Agent**: claude-sonnet-5-5（設計と判断は claude-opus-5-5 が controller として行い、実装と文書は sonnet が分担した）
- **ステータス**: 採用済み（手元の開発環境の変更。ただし api の起動時の拒否（`database.config.ts`・`app.ts`）は次の api のリリースで本番の Lambda にも入る。デプロイ後の確かめと戻し方は下の「本番へ出すとき」）
- **ブランチ**: chore/dev-db-separation（backend・socket も同名のブランチ）
- **spec**: docs/superpowers/specs/2026-11-05-dev-db-separation-design.md（計画: docs/superpowers/plans/2026-11-05-dev-db-separation.md）

---

## 背景

- 手元の api（`.env.local`）・backend・socket は本番の Supabase（project `nofubcikiabamlnlxpko`）に直接つながっていた。手元の画面で書き込むとそのまま本番に入るので、書き込みを伴う試しが気軽にできなかった。M3 臨時列車・M17・M20 改正入力のように、ダイヤや運用をまとめて書き換える仕事の前提になる。
- ユーザーが「困る」と言ったもの: ① 手元のつもりで本番に書く事故（「ヤバい」）、② 手元と本番で動きが食い違う（「割と困る」）、③ 今の手順が面倒になる（「面倒」）。

## 決定

ユーザーが決めたことと、私（Claude）が判断したこと（私の判断）を分ける。

### ユーザーが決めたこと

- **手元に Supabase（Postgres＋Auth）を Supabase CLI で docker に立てる**（案 1）。branch・別プロジェクトは費用がかかるので退けた。手元の api・backend・socket の既定の接続先はそこにする。
- **本番のデータを手元へ写すスクリプトを 1 本**用意し、いつでも写し直せるようにする（`npm run db:copy-from-prod`）。
- **手元専用の試験アカウント**でログインできるようにする。本番のアカウントで手元にログインできなくてよい。
- **手元の api は本番の DB に一切つながない**（2026-11-05 の事故の後に改めた）。本番の DB を向いていて、Lambda の上でないときは、api・CLI・TypeORM の CLI は起動を止める。最初は「本番に向けたら読み取り専用で立てる」だったが、下の事故で取り下げた。読み取り専用のロールを作る案も出たが、ユーザー「使うことあるんかな」— 手元の api を本番に向ける場面はほぼ無く（本番の再現は写し直しで足りる）、口ごと無くす方が単純で安全。
- **例外は本番への migration だけ。** 今まで `.env.local` で本番へ `migration:run` を流していた（ADR-0008・0009・0013）。これを `npm run migration:run:prod` 1 本にし、本番へ書ける口はこれだけにする。流す前に接続先と未適用の一覧を出し、`yes` と打たせる。
- migration の仕組みは TypeORM（`db/migrations`）のまま。Supabase CLI の `supabase/migrations` へは乗り換えない。CI で手元の Supabase は使わない。

### 私の判断

- **手元のスキーマは migration を空から流して作らず、本番の `pg_dump --schema-only`（`public`）を土台にする。** `db/migrations` は 2019 年の `CreateAllTables` から始まり途中が飛んでいて空から通る保証が無く、RLS は本番の `ensure_rls` イベントトリガー頼みで migration に書いていない（ADR-0013）。写した後の `migrations` 表も本番と同じなので、新しい migration は手元で `migration:run` してから本番へ、の順で試せる。
- **Supabase CLI の版を固定する**（devDependencies に `supabase` 3.0.0。`^` なし）。手元の Postgres の主版は本番と同じ 15。実際に引かれる image は 15.19、本番は 15.6.1.141 でマイナー版は合わない。
- **写す表を列挙する方式**（`db/scripts/copy-from-prod.tables.txt`）。個人に結びつく表を写し忘れ側に倒さない。写さないのは `auth.*` の中身・`profiles`・`operation_sighting_authors`・`operation_sighting_management_logs`・`user_access_traces`・`user_role_changes`・`m6_fix_20261024`。`feature_flags`・`calendar_dates` など設定の性格の表は写す（手元を本番と同じ挙動にする）。本番に表が増えて一覧のどちらにも無いときは、スクリプトの最後に知らせる。
- `pg_dump`・`psql` は手元の Supabase の DB コンテナの中のものを使い、ホストに入れない。
- 本番の判定は**接続先のホスト**（`*.supabase.com` / `*.supabase.co`）。Lambda の判定は `NODE_ENV` でなく `AWS_LAMBDA_FUNCTION_NAME` の有無（`NODE_ENV=production` を付けて手元から動かしても止める）。
- **起動時に向き先をログに出す**（`DB: 手元 / Auth: 手元`）。`DATABASE_URL` と `SUPABASE_URL` の向きが食い違うと起動しない（DB は手元で Auth は本番、のような混ざった状態を作らない）。向き先の表示と食い違いの停止は api だけに入れ、backend・socket は設定を分けるだけにした。
- DB 以外の外への書き込みも手元の既定では手元に向けるか止める: socket への合図は手元の serverless-offline へ、CDN の失効（`CDN_DISTRIBUTION_ID`）は空にして呼ばない、backend は手元の Supabase Auth へ。使っていない `COGNITO_*` は手元の既定から外した。
- 古い `development-db`（:5432）は api の `docker-compose.yml` から外した（volume `development-db-data` は残してある）。ルートの `docker-compose.yaml`（Cognito 時代）は触らない。
- `migration:revert` を本番に流す口、CLI（`rebuild-latest-cache` など）を本番に流す口は作らない。要るときは同じ形で足す。
- 試験アカウントの値（裁定 7）: ユーザー名 `dev-reporter` / `dev-editor` / `dev-manager` / `dev-viewer`、メール `dev-<役割>@users.sotetsu-lab.invalid`、パスワード `Dev-password1!`。ゲストは匿名ログイン。計画では `dev-*@example.test` / `dev-password` だったが、backend の `/api/auth/login` はユーザー名を `<名前>@users.sotetsu-lab.invalid` に直し、パスワードに大小英字・数字・記号を求めるので、client からログインできる形に合わせた（spec は値を縛っていない）。

### JWT の issuer の食い違い（spec §6 の確かめの結論）

- 手元の Auth が出すトークンの `iss` は `http://127.0.0.1:54321/auth/v1`（ホストから見た URL）。コンテナの api は `SUPABASE_URL=http://host.docker.internal:54321` なので、`AuthGuard` が `${SUPABASE_URL}/auth/v1` から作る issuer と合わない。
- 実物で確かめた: 匿名ログインしたトークンは ES256・`iss=http://127.0.0.1:54321/auth/v1`・`aud=authenticated`、JWKS は ES256/EC（本番と同じ）。
- **api に `SUPABASE_JWT_ISSUER` を足す方式にした。** 期待する `iss` は `SUPABASE_JWT_ISSUER` があればそれ、無ければ従来どおり `${SUPABASE_URL}/auth/v1`。JWKS の取得先は従来どおり `${SUPABASE_URL}/auth/v1/.well-known/jwks.json`。未設定なら本番の動きは完全に今のまま。
- `config.toml` の `jwt_issuer` を `host.docker.internal` にする案は採らなかった。ホスト側のブラウザ・backend が見る `iss` まで変わり、ホストから `host.docker.internal` が引けない環境で壊れる。
- 署名は本番に合わせて ES256（非対称鍵）。鍵の `supabase/signing_keys.json` は秘密なので git に入れない（`supabase/.gitignore`）。新しい clone では手順書の手順で作る（`echo '[]' > supabase/signing_keys.json` のあと `npx supabase gen signing-key --algorithm ES256 --append`。ファイルが先に無いと `GenSigningKeyReadError`）。

### 本番との食い違いを防ぐ（スキーマの差の扱い）

- 手元のスキーマを本番と比べる `db/scripts/compare-schema.sh`（`npm run db:compare-schema`）を作り、写し直しの最後にも流す。比べるのは ① `pg_dump --schema-only` の `public`（版・日時・owner・SET・コメントを落として正規化）、② カタログ（拡張・関数の権限と secdef・表の権限と RLS・policy・schema の権限・既定権限・イベントトリガー・auth のトリガー）。差があっても止めず、出力で知らせる（終了コード 0）。
- 実測の結果は差 0。負の確認として、手元に関数を 1 つ足す・表の RLS を外すと、差として出ることを見てから戻した。
- ただし差 0 にするために、**本番に migration が無く、手元の初期設定（写し直しのスクリプト）で足している物**がある。`pg_dump -n public` に入らない物と、手元の既定と本番の差:
  1. postgis 拡張（`public` の列が `extensions.geometry` を使う）。本番の拡張のうち Supabase が最初から入れる物・運用の道具を除いて `CREATE EXTENSION` する。
  2. `auth.users` の `on_auth_user_created` トリガー（`create_profile_on_auth_user_insert` を呼ぶ）と、イベントトリガー `ensure_rls`（`public.rls_auto_enable`）。カタログから生成して入れる。手元ではイベントトリガーが superuser の関数しか呼べないので、`rls_auto_enable()` の owner を supabase_admin にした（本番は postgres。owner の差は比べでは見ない）。
  3. 手元の `public` の既定権限は anon / authenticated にも付くが、本番は postgres・service_role だけ。ダンプは足す GRANT しか持たないので、先に revoke してから入れる。
  4. `CREATE SCHEMA public;` と `ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin ...`（手元に既に同じ物がある）はダンプから外す。
- 本番の Auth の hook（`public.custom_access_token_hook`・`public.before_user_created_hook`）は `supabase/config.toml` の `[auth.hook.*]` で有効にし、関数はダンプで入る。トークンの `user_role` は hook が `profiles.role` から入れる。

### 判断が要った所（私の判断）

- **未知のホストは local 扱い。** 本番の判定は `*.supabase.com` / `*.supabase.co` だけ。本番を独自ドメインに変える、あるいは別の名前の本番ができると、黙って「手元」と見なされて拒否が外れる。そのときは判定を足すこと。似た名前（`evilsupabase.co`）は本番にしない。
- **Auth の細かい設定は CLI の既定のまま**（`jwt_expiry` は 3600 など）。本番の Auth 設定を読む道具が無く（Management API はトークンが要る）、署名方式（ES256）・匿名ログイン・hook だけを本番に合わせた。トークンの寿命などは本番と違う可能性がある。手元で動いて本番で落ちたら、まずここを疑う。手元の Supabase は `realtime`・`storage`・`edge_runtime`・`analytics` を止めた（Studio・Inbucket は残した）。
- **裁定 6: 本番は Lambda だけで動くとみなす。** CI の deploy は `serverless deploy` のみで、ECS へイメージを出す道が無い。`taskdef.json` は env の更新に付いてきた名残とみなした。もし ECS で動く api が現役なら、`AWS_LAMBDA_FUNCTION_NAME` が無いので、次のイメージから起動を拒む。そのときは「本番の実行基盤」の判定（例 `ECS_CONTAINER_METADATA_URI_V4`）を拒否の例外に足す。確かめはユーザーに残した。
- **本番の Lambda で `AWS_LAMBDA_FUNCTION_NAME` が見えること**（実環境のログでは未確認。ブランチ全体の最終レビューが一次情報から「見える」と判断した）。根拠:
  - AWS のドキュメント（Lambda の環境変数「Defined runtime environment variables」）で、`AWS_LAMBDA_FUNCTION_NAME` は Lambda が初期化時に設定する予約変数。`_HANDLER`・`LAMBDA_TASK_ROOT`・`AWS_ACCESS_KEY_ID`・`AWS_SESSION_TOKEN` と同じ一覧にあり、同じ仕組みで渡る。関数の設定で上書き・削除はできない。
  - Web Adapter の `layer/bootstrap` は `exec -- "${LAMBDA_TASK_ROOT}/${_HANDLER}"` で `dist/run.sh` を起動する。wrapper 自身が予約変数を読んでいるので、見えていなければ今の本番は起動できない。`exec` なので環境はそのまま引き継がれ、`src/run.sh` は `env -i` などで環境を消さずに `node` を起動する。
  - `socket-signal.ts`・`cdn-invalidation.ts` の AWS SDK は認証情報を明示せず、同じ予約変数（`AWS_ACCESS_KEY_ID` など）から取っている。本番で socket への合図と CDN の失効が動いている時点で、同じ node プロセスに予約変数が届いている。
  - 判定は `Boolean(env.AWS_LAMBDA_FUNCTION_NAME)` で、関数名の値には依存しない。
  - 保険の変数（`SOTETSU_ON_LAMBDA` など）は足さない（裁定 9）。拒否の抜け道が増えるのと、予約変数で足りるため。

## 本番へ出すとき

`database.config.ts` は import 時に、本番の DB を向いて Lambda の外なら throw する。Lambda の上で万一判定が偽になると `main.js` が読み込みで落ち、Web Adapter の readiness が通らず全リクエストが落ちる。上の根拠から起きないと判断するが、このブランチを含む api のリリース（feat コミットがあるので版が上がる）は「本番に関係ない」変更ではない。

- **デプロイ直後の確かめ:**
  1. CloudWatch Logs に起動ログの `DatabaseTarget` が出ていて、`DB: 本番 / Auth: 本番`（warn）になっている。
  2. `/health-check` が 200 を返す。
  3. 書き込みが 1 つ通る（目撃の投稿など、通常の操作）。
- **戻し方:** 落ちた、または 1〜3 のどれかが満たされなければ、1 つ前の版を `npm run deploy` し直す（または `serverless rollback`）。ECS の道（裁定 6）が現役だった場合も、同じ症状（起動を拒む）になるので、まずここに戻す。

## 事故（2026-11-05）— 本番の pooler にセッションの状態を変える文を投げない

- 経緯: 最初の実装は、本番に向けた api を読み取り専用で立てるため、接続時に `options=-c default_transaction_read_only=on` を渡し、写し直しの `pg_dump` / `psql` にも `PGOPTIONS` で同じものを渡していた。
- 確かめると、Supavisor（pooler）は接続時の startup parameter（`options`）を session mode（:5432）・transaction mode（:6543）とも**黙って捨てた**。読み取り専用が効かず、`UPDATE ... WHERE false` が通った（0 行・害なし）。
- 代わりに接続直後に `SET default_transaction_read_only = on` を投げる作りにして確かめたところ、**transaction mode の共有の裏 backend に設定が残った。** 11:31〜12:0x JST に本番の pooler :6543 の backend 1 つに `default_transaction_read_only=on` が居座り、その backend に当たった本番の api の書き込みを止めかけた（見本取りの SELECT 60 本が全部 `on` だった）。拒まれた本物の書き込みは記録に無い（最後の目撃は 10:27）。ユーザーが `pg_terminate_backend` で解消し、:6543・:5432 とも 60/60 が `off` に戻ったことを確かめた。
- 教訓: **本番の pooler（特に transaction mode :6543）にセッションの状態を変える文（`SET`・`PGOPTIONS`・prepare・temp table など）を投げない。** pooler は接続を共有するので、状態は他の利用者に残る。読み取り専用が要る所は、そのトランザクションだけに効く `BEGIN READ ONLY; ...; COMMIT;` で行う（`pg_dump` は自分で読み取り専用のトランザクションを張る）。この教訓と、読み取り専用の仕組みごと取り下げた決定が、上の「手元の api は本番の DB に一切つながない」である。
- 「こちらから `SET` を送らない」と「本番に `SET` が届かない」は別。`pg_dump` は接続ごとに自分で `SET statement_timeout = 0`・`SET lock_timeout = 0`・`SET idle_in_transaction_session_timeout = 0`・`SET row_security = off`・`SET extra_float_digits TO 3`・`set_config('search_path', '', false)` などを送る（`copy-from-prod.sh` と `compare-schema.sh` の合わせて 3 回、本番の pooler に届く）。安全なのは、`lib.sh` の `load_prod_env` が `PGPORT=5432`（session mode）に固定していて、切断で戻るから。**写し直しは :6543 に絶対につながない**（変えると、この事故そのものを自分で繰り返す）。
- 写し直しで残る `pg_dump` 自身のセッション設定（`statement_timeout`・`row_security` など）は、本番の session mode（:5432）に残らないことを実測した。写し直しの後、本番 :5432 を `SELECT` だけで 40 本見本取りして、`statement_timeout=2min`・`row_security=on`・`extra_float_digits=0`・`default_transaction_read_only=off`・`search_path="$user", public, extensions` という既定のままだった（`pg_dump` の `SET` の 0 / off / 3 や空の `search_path` は残っていない）。session mode は切断で戻る。

## 却下した案

- Supabase の branch（案 2）・別プロジェクト（案 3）。費用がかかる。
- 本番に向けたら読み取り専用で立てる（接続の `options`、接続直後の `SET`）。pooler が `options` を捨て、`SET` は共有の裏 backend を汚す（上の事故）。
- 本番に読み取り専用のロール（`dev_readonly`: `ALTER ROLE ... SET default_transaction_read_only=on`・`public` の `SELECT` のみ）を作る。手元の api を本番に向ける場面がほぼ無いので、口ごと無くす方が単純（ユーザー）。
- migration を空から流して手元のスキーマを作る。途中が飛んでいて通る保証が無い。
- `config.toml` の `jwt_issuer` を `host.docker.internal` にする。ホスト側の `iss` まで変わる。
- 手元で本番の再現のために `start:dev:prod` のような口を残す。写し直しで足りる。

## 結果

- migration は無い。本番の DB への変更は無い。本番の Lambda では `AWS_LAMBDA_FUNCTION_NAME` があるので拒否を通る（起動の道に判定が 1 つ増える。確かめと戻し方は「本番へ出すとき」）。`auth.guard.ts` の `SUPABASE_JWT_ISSUER` は未設定なら従来どおり。
- 手順書は api の `README.md` の「手元の開発環境」。clone 直後は `.env.local` を作る → `.env.local.prod` を置く → 署名鍵を作る → `npm run supabase:start` → `npm run db:copy-from-prod`（約 1 分）→ `docker compose up`。`docker compose up` の流れは今までと同じで、足したのは最初の `supabase:start` と写し直しの 2 つ。
- 実地の確かめ（2026-11-05・spec §7）:
  - 既定の設定のまま、手元の api に試験アカウントのトークンで目撃を投稿（reporter・editor は 201）・時刻表を編集（editor は 200）し、手元の DB に入ることを確かめた。本番の行は、この作業の前後で controller が Supabase MCP で数えた（api は本番に向かう口を持たないので、本番に入る道が無い）。
  - `.env.local.prod` の値で `nest start`・`npm run cli`・TypeORM の CLI を流すと、接続の前に「DATABASE_URL が本番の DB を向いているので起動しない」で止まる。`DATABASE_URL` が手元で `SUPABASE_URL` が本番だと「向きをそろえること」で止まる。
  - 写し直し 58 秒。23 表の行数が本番と一致。写さない表は 0 行（`profiles` は試験アカウントの 4 行）、`auth.users`・`auth.identities` も試験アカウントの 4 件だけ。スキーマの比べは差 0。
  - 4 つの試験アカウントでログインでき、`user_role` が役割どおり。viewer の投稿は 403、editor・manager の時刻表の編集は 200、reporter・ゲスト・viewer の時刻表の編集は 403。ゲストは匿名ログインで読み取りができる。
- 確かめ方（単体テスト）:
  - 接続先の判定・拒否: `src/core/configs/database-target.spec.ts`（本番・`NODE_ENV=production`・`confirmed` 以外の値で拒否、Lambda・`confirmed`・手元で通る、メッセージに接続文字列を含めない）。
  - 入口ごとの拒否（`NestFactory.create` / `CommandFactory.run` を呼ばない、import で throw）: `app.spec.ts`・`cli.spec.ts`・`data-source.spec.ts`・`database.config.spec.ts`。`AppModule` を直接組む経路（e2e）も `database.config.ts` の import 時に止まる。
  - issuer: `src/core/modules/auth/auth.guard.issuer.spec.ts`。
- 本番へ書ける口は `migration:run:prod`（`db/scripts/migration-run-prod.sh`）だけ。`SOTETSU_PROD_MIGRATION=confirmed` はこの script の中でだけ付け、外から渡されていたら中止する。対話端末でないと run は動かない（`yes` を流し込めない）。`migration:show:prod` は一覧を見るだけ。
- 先送りした細かい点（直さなかった理由つき）:
  - `app.ts` の `resolveTarget`（起動停止の結線）は単体テストが無い。入口ごとの spec が拒否を覆っている。
  - `SUPABASE_JWT_ISSUER` は向き先の検査に入っていない。間違うと fail closed で 401 になるが、ログに原因が出ない。
  - `prod_sql` は SQL が失敗すると `COMMIT` / `ROLLBACK` を送らずに切れる。読み取り専用のトランザクションなので Postgres が巻き戻す。pooler 側の扱いは未検証。
  - 写し直しの途中で `kill` だけを送ると、前景の `pg_dump` が終わるまで後片付けの trap が待つ。端末の Ctrl-C ならプロセスグループ全体に届く。
  - `PG*` の環境変数が本番を向いたままの環境で、`DATABASE_URL` が無い起動は拒否を通す（`DATABASE_URL` が無いなら `createApp` は別に止まるが、cli・data-source は警告のみ）。極端なケース。
  - `data-source.ts` の `console.warn` が seed・`migration:generate` でも出る。
  - `docker-compose.yml` の改行が CRLF から LF に変わった。`package-lock.json` で dev 依存の `@noble/hashes` が 1.6.0 から 1.8.0 に上がった。
  - `.env.local.example` の `postgres:postgres@` が GitGuardian に反応しうる（spec のダミーと同じ性質の、CLI の既定の値）。
  - 手元の Postgres は 15.19、本番は 15.6.1.141（主版は一致）。マイナー版の違いで動きが食い違う可能性は残る。
  - `.env.local.prod` に `SOTETSU_PROD_MIGRATION` か `AWS_LAMBDA_FUNCTION_NAME` が書かれていると、`dotenv:prod` 経由の何でも拒否を素通りする（`migration-run-prod.sh` は環境しか見ていない）。この 2 つは書かない。直すなら `migration-run-prod.sh` と `lib.sh` の `load_prod_env` でファイルを検査して中止する。
  - `classifyUrl` は URL の `?host=` を見ない。`postgresql://…@localhost/postgres?host=<本番>` は「手元」になる（うっかりでは作らない形）。
  - 本番への接続が `sslmode=prefer`（証明書を確かめない）。直すなら `load_prod_env` に `PGSSLMODE=require` を足し、`prod_exec` に `-e PGSSLMODE` を足す（`SET` ではなく接続時のパラメータ）。
  - `lib.sh` の直結への切り替えで、`DATABASE_URL` が最初から直結（`PGUSER` に `.` が無い）だと `PROD_REF` が `postgres` になる。最初の session mode が通れば使われないので実害は小さい。
  - `migration:run:prod` は「見せた一覧」ではなく「流す時点の未適用」を流す。`yes` を待つ間に `db/migrations` が変わる（ブランチの切り替え・pull）と、見せていない migration も流れる。直すなら `yes` の直後にもう一度一覧を取って比べる。
  - backend・socket の README が `npx supabase start`、api の README が `npm run supabase:start` と、表記がそろっていない。
  - ADR の Agent 欄は sonnet だが、本文の判断は controller（opus）が中心。未追跡の `v12_backup.sql`（70 MB）がリポ直下にある（このブランチの物ではない。`.gitignore` の `*.sql` で守られている）。
  - ブランチ `backup/dev-db-before-trailer` が残っている（コミットのトレーラーを直す前の履歴。消すのはユーザー）。
