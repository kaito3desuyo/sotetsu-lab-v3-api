# ADR-0009: 目撃の投稿を登録者だけにし、投稿者を別の表に記録し、socket への合図を api から出す

- **日時**: 2026-10-23
- **Agent**: claude-sonnet-5-5
- **ステータス**: 採用済み（本番へのデプロイ前）
- **ブランチ**: feature/registered-only-posting
- **spec**: docs/superpowers/specs/2026-10-23-registered-only-posting-design.md

---

## 背景

- 登録制の①（Cognito をやめ Supabase Auth へ）の後、書き込み口のうちゲストでも通る所が残っていた。
  - 匿名のゲストのトークンには `user_role` が入らず、`AuthGuard` は `req.auth.role = null` にする。
  - `@RBAC` が無い書き込み口は `POST /v3/operation-sightings` と、trip-blocks の `POST /bulk`・`PUT /:id`・`PATCH /:id/add-trip`・`PATCH /:id/delete-trip`。
- `operation_sightings` に投稿者の情報が無く、問題のある投稿者を後から追えない。
- 目撃の無効化・復元は、body の `userId` をそのまま `operation_sighting_management_logs.user_id` に入れていた。body は利用者が自由に書ける。`user_id` に FK も無かった。
- socket は、client が投稿に成功した後に送る `sendSighting` を受けて本文をそのまま全接続に配っていた。ゲストでも送れるので、1 通で見ている全員に目撃を取り直させる増幅と、任意の本文の中継ができた。

## 決定

- 投稿者は目撃の本体に列を足さず、サブテーブル `operation_sighting_authors` に記録する。
  - 列は `operation_sighting_id`（PK・`operation_sightings(id)` への FK・ON DELETE CASCADE）、`user_id`（NOT NULL・`auth.users(id)` への FK）、`created_at`、`updated_at`。
  - 投稿者の分かる目撃にだけ行を作る。既存の 34 万件には作らない。
  - 投稿者は body で受けず、保存のトランザクションの中で `req.auth.userId` を入れる。応答にも読み取りの口にも出さない。
  - 相鉄館・v2 の「お名前」は持たない（ユーザー判断）。
- 権限を絞る。
  - 目撃の投稿は `@RBAC(REPORTER, EDITOR, MANAGER)`。匿名は 403。
  - trip-blocks の書き込み 4 本は `@RBAC(EDITOR, MANAGER)`。時刻表は編集者の仕事。
- 無効化・復元の利用者は JWT の `sub` を使う。`InvalidateOperationSightingDto`・`RestoreOperationSightingDto` から `userId` を消し、controller で `req.auth.userId` を渡す。
- `operation_sighting_management_logs.user_id` に `auth.users(id)` への FK を張る。
  - 本番の 2 人分・6,976 件は、どれも今の `auth.users` と `profiles` の利用者に一致することを確認済み。
  - `operation_sighting_authors` とそろえる。
- socket への合図は、api が保存に成功したら socket の broadcast 関数を非同期で呼ぶ形（案 d′）にする。client からの `sendSighting` は廃止する。
  - 目撃を保存したら `{"type":"sighting"}`、trip-blocks を保存したら `{"type":"timetable"}` を `InvocationType: Event` で送る。本文は空の合図だけ。
  - 部品は `src/core/modules/socket-signal/` の Nest モジュールにする（RBAC と同じ置き方・名前に Service を付けない）。`@aws-sdk/client-lambda` を依存に足した。
  - Invoke に失敗しても書き込みの応答は成功のまま返し、失敗は warn のログ（「socket への合図に失敗しました」）に残すだけにする。合図が届かなくても、次に取り直したときに見える。
  - 合図は書き込みの応答の前に待つ（api の Lambda の timeout は 3 秒）ので、詰まった Invoke が書き込み済みの応答を 504 にしないよう、Invoke は 1 回・接続 300ms・応答 1 秒で打ち切る。
  - 関数名は環境変数 `SOCKET_BROADCAST_FUNCTION_NAME` で渡す。未設定（ローカル・テスト）なら何もしない。
  - api の Lambda の IAM に、broadcast 関数 1 つへの `lambda:InvokeFunction` だけを足した（`serverless.ts`）。
- migration は `migration:generate` で作る（`1792739673780-AddOperationSightingAuthors`）。`auth.users` への FK は ① と同じく synchronize:false のモデル経由で張り、制約名は既定のハッシュ名に任せた。
- アクセストークンの寿命は Supabase の既定の 1 時間のまま。

## 根拠

- 目撃の本体には触らず、投稿者の分かる目撃にだけサブテーブルの行を作る。既存の 34 万件を巻き込まない。
- 合図を保存の成功にひもづければ、合図が本当の保存のときだけ出る。api が持つ権限は関数 1 つを呼ぶことだけで、socket 側で利用者を検証する仕組みも要らない。
- 無効化・復元の記録に body の値を使うと、別人の名前で操作を記録できる。JWT の `sub` なら偽れない。

## 却下した案

- 目撃の表に投稿者の列を足す。目撃の本体には触らず、サブテーブルにする。
- socket の側で絞る案（b＋c＋e）。登録者の接続だけ受け付け、本文を空にし、ルートにスロットリングを掛ける。
  - 登録者なら、投稿せずに合図だけ送れてしまう。
  - 投稿と合図が別々に失敗するずれも残る。
- `next-operation-candidates` を今回絞ること。読み取りなので別件にする。

## 影響

- 出す順は socket（broadcast 関数を足す）→ api → client → socket（`sendSighting` を消す）。
  - api を出す時点では古い client の `sendSighting` も動いているので、合図は二重に出る。害は無い。
  - 最後に socket の `sendSighting` のルートを消す。Service Worker に残った古い client が送ってきても、ルートが無いだけで害は無い。
- デプロイの前に、socket の broadcast 関数がデプロイ済みであることと、migration が本番に流れていることを確かめる。ローカルの api は本番 DB を読むので、migration を先に流してからローカルで動かす。
- `operation_sighting_authors` と `management_logs` の `user_id` は ON DELETE NO ACTION なので、記録のある利用者は削除できない。処分は ban（`banned_until`）で行う（記録を残すため）。
- 範囲外: 相鉄館・v2 の過去の投稿者名の取り込み（M5）、投稿者を処分する画面（処分は SQL と Supabase の管理画面で手作業）、`next-operation-candidates` の絞り込み、古い匿名利用者（`is_anonymous`）の掃除（M0）。
- 確かめ方:
  - 匿名（役割なし）の投稿は 403、reporter の trip-blocks の書き込みは 403（api のテスト）
  - 投稿で `operation_sighting_authors` に `sub` が入り、無効化で `management_logs.user_id` に `sub` が入る（api のテスト）
  - SocketSignal は失敗しても例外を投げない・既定のクライアントが 1 回・300ms・1 秒の上限で作られる（単体テスト）
  - 本番: ゲストで投稿が 403、登録者で投稿すると別の端末の real-time が更新される、trip-blocks を保存すると別の端末の時刻表が更新される、CloudWatch に「socket への合図に失敗しました」が出ていない
