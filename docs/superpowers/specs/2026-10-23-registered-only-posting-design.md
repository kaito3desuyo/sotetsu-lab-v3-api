# 目撃の投稿を登録者だけにする（登録制 ②）設計

-   日付: 2026-10-23
-   ブランチ: `feature/registered-only-posting`（api・socket・client）
-   前段: `docs/superpowers/specs/2026-10-19-supabase-auth-migration-design.md`（①。10 章で ② に回した項目をここで扱う）
-   リポジトリごとの設計: socket・client の `docs/superpowers/specs/2026-10-23-registered-only-posting-design.md`。backend は変更なし
-   ロードマップ: `docs/roadmap.md` の M1

## 1. 目的

-   目撃の投稿を、登録した利用者だけにする。誰が投稿したかを記録し、問題のある投稿者を後から追って処分できるようにする（処分は記録＋手作業。投稿者名は画面に出さない）
-   書き込み口のうち、ゲストでも通ってしまう所をふさぐ
-   socket の合図を、ゲストでも誰でも流せる今の形から、保存に成功したときだけ出る形に替える

## 2. 今の作り（2026-10-23 にコードと本番 DB で確認）

-   匿名のゲストのトークンには `user_role` が入らない（`custom_access_token_hook` は `profiles` にいる利用者にだけ役割を付ける）。`AuthGuard` は `req.auth.role = null` にする
-   `@RBAC` が無い書き込み口:
    -   `POST /v3/operation-sightings`
    -   trip-blocks の `POST /bulk`・`PUT /:id`・`PATCH /:id/add-trip`・`PATCH /:id/delete-trip`
-   `operation_sightings` に投稿者の情報は無い
-   目撃の無効化・復元（`PATCH /:id/invalidate`・`/:id/restore`）は、body の `userId` をそのまま `operation_sighting_management_logs.user_id` に入れている。本番の値は 2 人分・6,976 件で、どれも今の `auth.users` と `profiles` の利用者に一致する。`user_id` に FK は無い
-   socket は、client が投稿に成功した後に送る `sendSighting` を受けて、本文をそのまま全接続に配る。ゲストでも送れるので、1 通で見ている全員に目撃を取り直させる増幅と、任意の本文の中継ができる
-   v2 の書き込み口は v4.0.0 で v2 ごと消えたので対象外

## 3. 決めたこと

| 論点 | 決定 | 理由 |
| --- | --- | --- |
| 投稿者の記録 | サブテーブル `operation_sighting_authors` | 目撃の本体には触らない。投稿者の分かる目撃にだけ行を作る |
| 相鉄館・v2 の「お名前」 | 持たない | ユーザー判断（2026-10-23） |
| 目撃の投稿 | `@RBAC(REPORTER, EDITOR, MANAGER)` | 匿名は 403 |
| trip-blocks の書き込み | `@RBAC(EDITOR, MANAGER)` | 時刻表は編集者の仕事 |
| 無効化・復元の利用者 | JWT の `sub` を使い、body の `userId` を消す | body は利用者が自由に書ける |
| `management_logs.user_id` | `auth.users` への FK を張る | 全件つながっていることを確認済み。`operation_sighting_authors` とそろえる |
| socket の合図 | 案 d′: api が保存に成功したら socket の broadcast 関数を非同期で呼ぶ。`sendSighting` は廃止 | 合図が本当の保存のときだけ出る。本文は空の合図だけ。api の権限は関数 1 つを呼ぶことだけ |
| アクセストークンの寿命 | Supabase の既定の 1 時間のまま | 短くする理由が無い |
| ログイン・登録 | ページ（`/login`・`/register`）にそろえ、ダイアログは消す | M4 の同意ページからも同じ入口に送れる（client の spec） |
| `next-operation-candidates` | 今回は絞らない | 読み取りなので別件 |

却下した案: socket の側で絞る案（b＋c＋e。登録者の接続だけ受け付け、本文を空にし、ルートにスロットリング）。登録者なら投稿せずに合図だけ送れ、投稿と合図が別々に失敗するずれも残るため。

## 4. データ

```
operation_sighting_authors
  operation_sighting_id  uuid         PK, FK → operation_sightings(id) ON DELETE CASCADE
  user_id                uuid         NOT NULL, FK → auth.users(id)
  created_at             timestamptz
  updated_at             timestamptz
```

-   既存の 34 万件には行を作らない
-   `operation_sighting_management_logs.user_id` に `auth.users(id)` への FK を足す
-   `auth.users` への FK は、①と同じく synchronize:false のモデル経由で張る。制約名は既定のハッシュ名に任せる
-   migration は `migration:generate` で作る（手書きしない）。ローカルの api は本番 DB を読むので、migration を先に流してからローカルで動かす

## 5. api の変更

### 5.1 目撃の投稿

-   `POST /v3/operation-sightings` に `@RBAC(REPORTER, EDITOR, MANAGER)` を付ける
-   保存のトランザクションの中で、`operation_sighting_authors` に `req.auth.userId` を入れる。投稿者は body で受けない
-   投稿者は今の応答（`OperationSightingDetailsDto`）にも、読み取りの口にも出さない

### 5.2 trip-blocks

-   `POST /bulk`・`PUT /:id`・`PATCH /:id/add-trip`・`PATCH /:id/delete-trip` に `@RBAC(EDITOR, MANAGER)` を付ける

### 5.3 無効化・復元

-   `InvalidateOperationSightingDto`・`RestoreOperationSightingDto` から `userId` を消し、controller で `req.auth.userId` を渡す。`@RBAC(EDITOR, MANAGER)` は今のまま

### 5.4 合図

-   目撃を保存したら `{"type":"sighting"}`、trip-blocks を保存したら `{"type":"timetable"}` を、socket の broadcast 関数に `InvocationType: Event` で送る
-   Invoke に失敗しても、書き込みの応答は成功のまま返す。失敗は warn のログに残すだけにする（合図が届かなくても、次に取り直したときに見える）
-   部品は `src/core/modules/<役目>/` の Nest モジュールにする（RBAC と同じ置き方）。名前に Service を付けない
-   api の Lambda の IAM に、broadcast 関数 1 つへの `lambda:InvokeFunction` を足す（今の `serverless.ts` には `iamRoleStatements` が無い）。関数名・ARN の渡し方（env か SSM か）は計画で実物を見て決める
-   ローカル（serverless-offline）では Invoke しないか、失敗のログだけで済むようにする

## 6. 出す順

```
socket（broadcast 関数を足す）→ api → client → socket（sendSighting を消す）
```

1. socket: broadcast 関数を足してデプロイする。まだ誰も呼ばないので、今の動きは変わらない
2. api: migration → RBAC・投稿者の記録・合図。この時点で古い client の `sendSighting` も動いているので、合図は二重に出る（害は無い）
3. client: ログイン・登録のページ、ゲストへの案内、合図の受け側、`emit('sendSighting')` の削除
4. socket: `sendSighting` のルートを消す。Service Worker に残った古い client が送ってきても、ルートが無いだけで害は無い

## 7. 確かめること

-   計画の最初に: 編集者のトークンの `user_role` が 1 つの値か（`RBACGuard` は `includes` の完全一致）
-   api のテスト: 匿名（役割なし）の投稿は 403・reporter の trip-blocks の書き込みは 403・投稿で `operation_sighting_authors` に `sub` が入る・無効化で `management_logs.user_id` に `sub` が入る・Invoke に失敗しても 201
-   本番: ゲストで投稿が 403、登録者で投稿すると別の端末の real-time が更新される、trip-blocks を保存すると別の端末の時刻表が更新される

## 8. 範囲外

-   相鉄館・v2 の過去の投稿者名の取り込み（M5）
-   投稿者を処分する画面（処分は SQL と Supabase の管理画面で手作業）
-   `next-operation-candidates` の絞り込み
-   古い匿名利用者（`is_anonymous`）の掃除（M0）
