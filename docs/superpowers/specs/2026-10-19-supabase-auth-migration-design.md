# 認証基盤を Supabase Auth に移す（Cognito と自前のユーザー・セッションをやめる）設計

- 日付: 2026-10-19
- ブランチ: API `feature/supabase-auth`（backend・socket・client は計画で同名のブランチを切る）
- 発端: マイルストーン「運用目撃情報の投稿を完全ユーザー登録制にする」。目的は投稿者の追跡と処分。今のトークンでは投稿者を見分けられないため、その前提として認証基盤を移す
- 位置付け: 2 段のうちの ①。② 登録制と投稿者の記録は、① の上に別の spec で設計する（10 章）

## 1. 目的

- トークンを **利用者ごと** にし、API が `sub`（ユーザー ID）と役割で人を見分けられるようにする
- Cognito と、backend の自前のユーザー・セッション（DynamoDB）をやめ、利用者とセッションの正本を Supabase Auth に寄せる
- client からは認証基盤を引きはがしたままにする（client は Supabase を知らない。ログイン・登録・トークンは backend 経由）
- 読み取りもトークンを求める（データを勝手に使う別の client を作らせない）。ゲストには backend が Supabase の **匿名セッション**（Anonymous Sign-Ins）を作り、そのトークンを渡す。人を見分けるのは登録者だけで、匿名は「この site から来た」ことの証明に使う

## 2. 今の作りと問題

- ゲストにも登録ユーザーにも、Cognito の client credentials で取った **役割ごとの共有トークン** を配っている。ゲストと reporter は同じ `sotetsu-lab-v3-api/reporter`。トークンに「誰か」が無い
- 利用者（105 人: manager 1・editor 4・reporter 100。2026-10-19 本番）とセッションは backend の DynamoDB 管理テーブル。パスワードは argon2id
- backend の `GET /api/token` は認証無しで `fullaccess` のトークンを返す。client は `/api/auth/token` しか使っていない（穴）
- Cognito のプール `ap-northeast-1_S4qRgsVV8`（2019 作成・トリガー無し・プールの利用者 1）。app client `sotetsu-lab-v3-web` は client credentials のみ

## 3. 移行後の形

| | 今 | 移行後 |
|---|---|---|
| 利用者 | DynamoDB `users#…` | Supabase Auth `auth.users` ＋ `public.profiles` |
| ログイン | backend `login` → DynamoDB セッション | backend `login` → Supabase `signInWithPassword` → トークンを HttpOnly Cookie に |
| 登録 | backend `register-user` → DynamoDB | backend `register-user` → Supabase 管理 API（service キー）。`profiles` は `auth.users` の trigger が作る |
| トークン | Cognito の役割ごとの共有トークン | Supabase の利用者ごとの JWT。`user_role` を Custom Access Token Hook で入れる |
| セッション | DynamoDB | Supabase `auth.sessions` だけ（backend は持たない） |
| api の検証 | Cognito。全部の口でトークン必須 | 全部の口でトークン必須（ゲストは匿名セッション）。Supabase JWT を JWKS で検証し、`@RBAC` の口は `user_role` も見る |
| socket | 接続に Cognito トークン必須 | 接続もトークン必須（ゲストは匿名セッション）。検証して `sub`・`role` を接続の context に |
| 撤去 | — | Cognito プール・app client、backend `get-token`（`/api/token`）、DynamoDB の管理テーブルとキャッシュテーブル |

### 3.1 利用者の識別子

- 利用者はメールアドレスを入れない。backend が `username` を内部用のダミーのメールアドレス `{username を小文字にしたもの}@users.sotetsu-lab.invalid` に機械的に変えて Supabase に渡す（`.invalid` は RFC 2606 で予約済みで、届かない）
- メールの確認は切る。公開サインアップは、匿名サインインのためにオンにするが、Before User Created hook で匿名以外を拒む（メールの利用者を作るのは backend の管理 API だけ）
- ログインは大文字と小文字を区別しなくなる。本番で大小だけ違う衝突は 0（大文字を含むユーザー名は 48）。表示名は元の書き方を `profiles.display_name` に残す
- パスワード再設定の画面は作らない。忘れた人には、管理者が Supabase の管理画面か管理 API で仮のパスワードを設定する。任意のメール登録は後から足せるよう、ユーザー名は `profiles.username` を正本にする（ダミーのメールアドレスに頼る所は backend の変換 1 か所だけにする）

### 3.2 profiles

`public.profiles`

| 列 | 型 | 備考 |
|---|---|---|
| `user_id` | uuid PK | `auth.users(id)` への外部キー。on delete cascade |
| `username` | text | 一意（小文字にした値で一意。表示用は `display_name`） |
| `display_name` | text | 元の書き方 |
| `role` | text | `reporter` / `editor` / `manager` |
| `created_at` / `updated_at` | timestamptz | |

- マイグレーションは api の `migration:generate` で作る。`auth.users` への外部キーだけ SQL を書き足す
- `anon`・`authenticated` からは読み書きさせない（RLS を有効にし、hook 用に `supabase_auth_admin` の SELECT ポリシーだけ作る。読むのは hook の `supabase_auth_admin` だけ）
- 行は `auth.users` の AFTER INSERT の trigger（`security definer`）が作る。`username` はダミーのメールアドレスの前半、`display_name` は `raw_user_meta_data.display_name`、`role` は `reporter` 固定、`created_at` は `auth.users.created_at`。役割は `user_metadata` に置かない（利用者が自分のトークンで書き換えられるため）。登録後の正本は profiles
- Data API（PostgREST）は閉じる。backend は profiles を読み書きしない。secret key が漏れても触れるのは Auth の管理だけにするため。念のため public の表・関数から `anon`・`authenticated` の権限も剥がしておく

### 3.3 Custom Access Token Hook

- `public.custom_access_token_hook(event jsonb)` で、`profiles.role` を claim `user_role` に、`profiles.display_name` を claim `display_name` に入れる。profiles が無い利用者はどちらも入れない（RBAC の口は 403）
- 役割を変えたら、効くのは次のトークン更新から（遅くともアクセストークンの寿命以内）
- `supabase_auth_admin` だけに実行と profiles の読み取りを許す（公式の例のとおり）

## 4. 流れ

```
[ログイン]
client ─POST /api/auth/login {username, password}→ backend
  backend: ダミーのメールアドレスに変換 → signInWithPassword
  ←Set-Cookie: sb-access, sb-refresh（HttpOnly; Secure; SameSite=Lax; Domain=sotetsu-lab.com; Path=/api）, loggedIn（今と同じ目印）
  ※ 旧の sessionId Cookie は Cookie を書くたびに消す

[トークン]
client ─GET /api/auth/token→ backend
  sb-access が有効（切れる 60 秒前まで）→ 200 { accessToken, tokenType, expiresAt }
  切れかけ・無効で sb-refresh あり → refreshSession → Cookie を書き換えて 200
  更新に失敗（失効・ban）・Cookie 無し（ゲスト）→ signInAnonymously → 匿名の Cookie を書いて 200
    （匿名のときは loggedIn を立てない。access token の is_anonymous で見分ける）

[読み取り]  client ─X-Sotetsu-Lab-Authorization: Bearer <JWT（匿名でも可）>→ api → JWKS で検証。無ければ 401
[書き込み]  client ─X-Sotetsu-Lab-Authorization: Bearer <JWT>→ api → JWKS で検証 → user_role で RBAC

[ログアウト]
client ─POST /api/auth/logout→ backend: signOut（そのセッションを失効）→ Cookie を消す
```

- `sb-*` の Cookie は `Path=/api` に絞る（backend の口は `/api/auth/*` と `/api/user/profile`）。api は別ドメイン（`api.sotetsu-lab.com`）なので Cookie は使わず、今までどおり client が付けるヘッダーで受け取る
- 応答のキャッシュ: `/api/auth/token` は今と同じく `Cache-Control: no-store`

## 5. 各リポジトリの変更

### 5.1 Supabase（設定と SQL。MCP は読み取り専用なので、書き込みはユーザーが流す）

- JWT の署名鍵を非対称にする（Migrate JWT secret → rotate。止めずに行える）
- メールの確認を切る。公開サインアップと匿名サインインをオンにし、Before User Created hook で匿名以外を拒む
- `profiles` のマイグレーションと `auth.users` への外部キー・profiles を作る trigger
- `custom_access_token_hook` の作成と有効化
- Data API は閉じたまま（Integrations → Data API）

### 5.2 api

- `AuthGuard`: ヘッダーが無ければ 401。あれば Supabase の JWKS で検証し、失敗なら 401
- `RBACGuard`: `@RBAC` の口で payload が無ければ 401、`user_role` が合わなければ 403
- `Role` を `reader` / `reporter` / `editor` / `manager` の素の値にする
- 切り替えの途中だけ Cognito と Supabase の両方を受け付ける（9 章の 2〜6）。両方の判定は Guard の中に閉じ、役割は同じ `Role` に揃えて RBACGuard に渡す。2026-10-20 に 9 章の 6 で Cognito を外し、今は Supabase 以外の `iss` を検証に回さずに 401 にする
- 検証ライブラリは汎用の `jose` ^6（ESM 専用。api の実行環境は Node 24 なので CommonJS から require できる）。切り替えの途中の Cognito の検証だけ今の `aws-jwt-verify` 4.0.1 を残し、9 章の 6 で依存ごと消す（2026-10-20 に消した。Cognito の公開鍵を同梱していた `jwks.json` も）。Supabase の署名鍵は推奨どおり ES256（P-256）
- Supabase の access token は `iss` = `https://nofubcikiabamlnlxpko.supabase.co/auth/v1`・`aud` = `authenticated`（公式の JWT fields）

### 5.3 socket・backend・client

各リポの設計は、そのリポの spec・計画・ADR に書く（この spec は全体の形・api・Supabase・切り替えの順番だけを持つ）。spec と計画のパスは、どのリポもこの spec・計画と同じ（`docs/superpowers/specs/2026-10-19-supabase-auth-migration-design.md`・`docs/superpowers/plans/2026-10-19-supabase-auth-migration.md`）。

- socket: `sotetsu-lab-v3-socket` の spec・計画（Task 4）・`docs/adr/0001-supabase-auth.md`。接続にもトークンを求め、Supabase の JWT を検証する
- backend: `sotetsu-lab-v3-backend` の spec・計画（Task 6〜13）・`docs/adr/0001-supabase-auth.md`。ログイン・登録・トークン・プロフィール・ゲストの匿名セッション・移行スクリプト・撤去
- client: `sotetsu-lab-v3-client` の spec・計画（Task 5）・`docs/adr/0009-supabase-auth.md`。トークンが取れなくても起動を止めず、socket はトークンが取れてからつなぐ

## 6. エラーの扱い

| 場面 | 応答 |
|---|---|
| ログインの失敗 | 401（今と同じ文言） |
| Supabase に届かない | backend は 503。client は今の失敗の案内 |
| トークンの更新に失敗（失効・ban） | 匿名セッションを作り直して 200（ゲストに戻る） |
| 匿名サインインのレート制限（IP ごと） | 429 → backend は 503。携帯の CGNAT で同じ IP を多くの人が使うので、Supabase の制限は既定（30/時）より上げる |
| api: トークンが無い | 401 |
| api: 壊れた・期限切れの JWT | 401 |
| api: 役割が足りない | 403 |
| 登録: ユーザー名の重複 | 422（今と同じ） |

## 7. 処分

- 役割を下げる: `profiles.role` を書き換える。効くのは次のトークン更新から（遅くともアクセストークンの寿命以内）
- 止める: Supabase の ban（管理 API の `ban_duration`）。更新が失敗し、ゲストに戻る
- アクセストークンの寿命（Supabase の既定は 1 時間）を短くするかは ② で決める

## 8. テスト

- api: Guard の単体テスト（ヘッダー無しは 401・匿名は通す・正しい JWT・壊れた JWT・期限切れ・役割違い・Supabase 以外の発行元は 401）
- socket・backend・client: それぞれのリポの spec の「テスト」
- 移行スクリプト: 本番の dry-run で 105 人・衝突 0 を確かめる
- 実機: 手元は本番の DB と本番の Supabase につながる。確かめるのは検証用の利用者 1 人で、ログイン → トークン → 書き込み（RBAC の付いた口）→ ログアウトを通し、終わったら消す

## 9. 切り替えの順番

どの時点でも、読み取りもログインも止まらないようにする。

1. Supabase の設定・`profiles`・hook（5.1）。匿名サインインを有効にし、その制限を上げる。trigger は匿名（`is_anonymous`）に profiles を作らない。匿名サインインは「Allow new users to sign up」がオンでないと `signup_disabled` で断られるので、先に Before User Created hook（`public.before_user_created_hook`）で匿名以外の作成を 403 にしてからオンにする。管理 API の作成（backend の登録・移行スクリプト）はこの hook を通らない（GoTrue の `adminUserCreate` は hook を呼ばない。手元で登録が通ることも確認済み）
2. api・socket を、両方受け付ける形でデプロイ。読み取りもトークン必須だが、今の backend はゲストにも Cognito の共有トークンを配っているので止まらない
3. client をデプロイ
4. 移行スクリプトを本番で流す（直前に dry-run）。書き出された `UPDATE` 文を SQL Editor で流し、役割と登録日時を戻す
5. backend をデプロイ。ここから Supabase で動き、ゲストは匿名セッションになる。`/api/token` が消える。今のセッションは使えなくなり、全員 1 回ログインし直し
6. 様子を見て、api・socket から Cognito の受け付けを外す（2026-10-20 に実施。backend のデプロイから Cognito のアクセストークンの有効期間 60 分が過ぎたこと、CloudTrail の `Token_POST` が 90 日分すべて backend の `openid-client` からで 13:36 を最後に止まっていること、socket の接続に Cognito のトークンが無いことを確かめてから）
7. 撤去: Cognito のプールと app client、DynamoDB の管理テーブルとキャッシュテーブル。**消す前に中身を列挙して、ユーザー・セッション・トークン以外が無いことを確かめ、ユーザーの確認を取ってから手で消す**。Cognito は、トークンの発行の記録（CloudWatch の指標か CloudTrail）で backend 以外から発行されていないことも確かめる（外部が app client の資格情報で直接取っている可能性をリポジトリの検索だけでは否定できないため）

4 と 5 の間に登録した利用者は、5 の直前にもう一度スクリプトを流して拾う（何度流しても同じ結果になる作りのため）。

## 10. 範囲外（② と別件）

- ②（別の spec）: 目撃の投稿者の記録（`user_id`）と投稿の `@RBAC(REPORTER, EDITOR, MANAGER)`、ゲストの投稿カードを「ログインが必要です」に差し替え、trip-blocks の書き込みの RBAC、v2 の書き込み口の削除、socket の `sendSighting` を登録済みの接続だけに、アクセストークンの寿命
- 目撃の無効化・復元が body の `userId` を信じている件（② で JWT の `sub` に替えるか検討）
- パスワード再設定の画面・任意のメール登録
- API の外部公開（登録した利用者に client_id・client_secret を発行して API を使わせる）: Supabase の OAuth 2.1 Server（2026-10 時点で beta）で行う（2026-10-20 ユーザー決定）。confidential client を管理 API で発行し、持ち主が最初の 1 回だけ同意の画面で許可して、あとは refresh token で延ばす。client_credentials は Supabase に無い。トークンには `client_id` と持ち主の `sub` が入り、Custom Access Token Hook も通るので、api の検証と RBAC は今のまま使える。作るのは同意の画面と発行の画面。却下: 影の利用者を client_secret をパスワードにして作る案（公式の型でない）、自前の client_credentials と KMS 署名（自前の発行元が増える）。読み取りだけの機械はトークンが要らない
- 全面的な BFF 化（SSR の計画で CloudFront の経路と一緒に検討）

## 11. 確かめた事実（2026-10-19）

- refresh token を使い回せる時間は既定 10 秒（変えないことを公式が推奨）。加えて「今の token の親」を出した場合は今の token が返る。どちらにも当たらない使い回しはセッションごと失効する（Supabase sessions の FAQ）
- この Supabase プロジェクト（`nofubcikiabamlnlxpko`）の JWKS は `{"keys":[]}`＝旧来の HS256 のまま。非対称への移行が要る。`auth.users`・`auth.sessions` は 0 件、`profiles` は無い
- 管理 API は `id` と `password_hash` を受け付ける（supabase/auth `AdminUserParams`。supabase-js の `createUser` は属性をそのまま送る）
- JWKS のキャッシュ: `aws-jwt-verify` の `JwtVerifier` は Lambda の 1 実体の中で JWKS を持ち回る。Supabase 側の JWKS は edge で 10 分キャッシュされる（鍵の切り替えはそれ以上待つ）
- 旧サイト（sotetsu-lab.com）は v3 への転送ページだけで、API を使っていない

## 12. 匿名セッションの後始末

- 匿名の利用者はトークンを取るたびではなく、Cookie を持たない訪問（初回・Cookie 消去・クローラー）ごとに増える。MAU に数える（月約 1,200 なので枠には響かない）
- 古い匿名の利用者は定期的に消す（例: 最終サインインから 30 日以上の `is_anonymous` を `auth.users` から削除）。やり方（pg_cron か手で）は切り替えの後に決める
