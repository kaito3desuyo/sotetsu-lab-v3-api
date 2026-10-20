# ADR-0005: 認証基盤を Supabase Auth に移す

- **日時**: 2026-10-19
- **Agent**: claude-sonnet-5-5
- **ステータス**: 採用済み
- **ブランチ**: feature/supabase-auth
- **spec**: docs/superpowers/specs/2026-10-19-supabase-auth-migration-design.md

---

## 背景

- ゲストにも登録者にも Cognito の役割ごとの共有トークンを配っており、API が利用者を見分けられなかった。目撃の投稿者を追跡するにはトークンが利用者を表す必要がある。

## 決定

- 利用者・セッションを Supabase Auth に寄せ、Cognito と backend の DynamoDB の利用者・セッションをやめる。
- client は Supabase を知らない。backend がログイン・登録・更新・ログアウトを行い、トークンを HttpOnly Cookie（Path=/api）に入れる。
- 利用者はメールアドレスを入れない。backend がユーザー名を `…@users.sotetsu-lab.invalid` に変える。
- 読み取りもトークン必須。ゲストには backend が Supabase の匿名セッションを作る（データを勝手に使う別の client を作らせないため。CORS も今のまま）。Supabase の JWT（ES256・JWKS）を検証し、@RBAC の口は `user_role`（Custom Access Token Hook が profiles から入れる。匿名は profiles を持たないので付かない）で判定する。

## 却下した案

- backend が自前で署名した本人証明 JWT（鍵の管理が面倒）。
- backend が fullaccess で代理投稿（権限が強すぎ、取りつくろい）。
- セッション Cookie を api・socket が直接見る（API だけを外部公開する構想と合わない）。
- Cognito の事前トークン生成で userId を埋め込む（Essentials と M2M の 1 件課金）。
- Cognito のユーザープールへの移行（Cognito 自体をやめたい）。

## 影響

- 全員 1 回ログインし直し。
- パスワード再設定の画面は無い（管理者が手で設定）。
- Supabase の JWT の検証は汎用の `jose`。切り替えの途中だけ Cognito 用に `aws-jwt-verify` を残し、Cognito の受け付けを外すときに依存ごと消す。
  - 2026-10-20 追記: 切り替えが済んだので外した。今は Supabase 以外の `iss` を検証に回さずに 401 にする。

## 実装で決めたこと

- socket・backend・client の決定は、それぞれのリポの ADR に書く（socket・backend は ADR-0001、client は ADR-0009）。この ADR は api と Supabase（profiles・hook・trigger・Data API）の決定だけを持つ。
- api は `SUPABASE_URL`（SSM）が必須で、無ければ起動時に落ちる。
- Data API（PostgREST）は閉じる。backend は profiles を読み書きしない。登録した利用者の profiles は `auth.users` の trigger が `reporter` で作り、プロフィールは hook が JWT に入れる `display_name`・`user_role` から返す。secret key が漏れても触れるのを Auth の管理だけに留めるため。役割を `user_metadata` に置かないのは、利用者が自分で書き換えられるから。既存の利用者の元の役割と登録日時は、移行スクリプトが書き出す `UPDATE` 文をユーザーが流して戻す。念のため public の表・関数から `anon`・`authenticated` の権限も剥がした
- profiles の `auth.users` への外部キーはモデルにも書く（`auth.users` を `synchronize: false` の `AuthUserModel` として映す。制約名は TypeORM の既定のハッシュ名）。モデルに無いと `migration:generate` がこの外部キーを DROP する差分を出す。
- 匿名の利用者（`auth.users.is_anonymous`）には profiles を作らない（trigger に `WHEN (NOT NEW.is_anonymous)`）。匿名は email が NULL なので、作ろうとすると INSERT が落ちて匿名サインインごと失敗する。
- 匿名サインインは「Allow new users to sign up」がオンでないと断られる。オンにすると公開の `/auth/v1/signup` からメールの利用者を作れてしまうので、Before User Created hook（`public.before_user_created_hook`）で匿名以外を 403 にする。管理 API の作成（backend の登録・移行スクリプト）はこの hook を通らない（GoTrue の `adminUserCreate` は hook を呼ばない）。
