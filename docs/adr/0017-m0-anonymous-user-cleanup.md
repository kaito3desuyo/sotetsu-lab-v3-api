# ADR-0017: 使われなくなった匿名利用者を pg_cron で毎日消す（M0）

- **日時**: 2026-11-11
- **Agent**: claude-opus-5-5
- **ステータス**: 採用済み（本番にはジョブを先に手で入れた。マイグレーションは本番に未適用。初めて消すのは 2026-11-19 ごろ）
- **ブランチ**: docs/m0-cleanup
- **関連**: ADR-0013（手がかりの 90 日の削除を api の中でやる）、ADR-0015（開発用 DB の分離）

---

## 背景

- 登録制に切り替えた 2026-10-20 から、backend はゲストに Supabase の匿名セッション（`signInAnonymously`）を作っている。匿名利用者は `auth.users` に 1 日 200 人前後ずつ増える。
- 2026-11-11 の本番は、全 5,138 人のうち 5,010 人が匿名だった。目撃・管理ログ・`profiles`・アクセス記録・ロール変更のどれからも参照されていない（すべて 0 件）。
- refresh token の Cookie は 30 日で切れる（backend の `REFRESH_MAX_AGE_SECONDS`）。30 日使われなかった匿名利用者は、もう誰も使えない。
- 消した利用者の Cookie で来ても困らない。backend は refresh を断られるとゲストとして扱い、匿名セッションを作り直す（backend の `resolve-session.usecase.ts`）。
- Supabase には匿名利用者を自動で消す仕組みが無い。文書は `created_at` が 30 日より前の匿名利用者を SQL で消すよう勧めている（https://supabase.com/docs/guides/auth/auth-anonymous ）。

## 決定

- `pg_cron` を入れ、ジョブ `delete-idle-anonymous-users` を毎日 19:00 UTC（日本時間 4:00）に動かす。どちらもマイグレーション `1794389397371-ScheduleIdleAnonymousUserCleanup` で定義する。本番・開発用 DB・手元の Supabase に同じジョブが入る。
- マイグレーションは `migration:run:prod`（`postgres`）で流すので、ジョブの持ち主は `postgres` になる。`cron.schedule` は同じ持ち主・同じ名前のジョブを上書きするので、手で入れた本番に流しても二重にならない（2026-11-11 に本番でトランザクションの中で流し、ROLLBACK して確かめた）。
- `down` はジョブだけを消し、拡張は残す。
- 消すのは、作ってから 30 日を過ぎ、セッションが最後に使われてからも 30 日を過ぎた匿名利用者。`created_at` だけで消すと、毎日来るゲストも 30 日目に消えてしまうので、セッションの `refreshed_at` も見る。

```sql
delete from auth.users u
where u.is_anonymous is true
  and u.created_at < now() - interval '30 days'
  and not exists (
    select 1 from auth.sessions s
    where s.user_id = u.id
      and coalesce(s.refreshed_at, s.updated_at, s.created_at) > now() - interval '30 days'
  )
```

- `auth.sessions`・`auth.refresh_tokens`・`auth.identities` の行は、外部キーで一緒に消える。

## 入れたときに分かったこと

- 最初は本番に手で入れた。マイグレーションにしたのは、手で入れたものが本番にしか無い状態を作らないため。
- Supabase MCP の `execute_sql` は `supabase_read_only_user` で動く。MCP から `cron.schedule` を呼ぶとジョブの持ち主がこの利用者になり、`auth.users` を消す権限が無いので、ジョブは毎日動いても権限のエラーで失敗する。本番のジョブは api の `DATABASE_URL`（`postgres`）の接続で登録し直した。
- `cron.unschedule` は持ち主のジョブしか消せない。`postgres` からは `cron.job` の行も消せなかった。

## ADR-0013 との関係

- ADR-0013 が手がかりの 90 日の削除を api の中でやると決めた理由は、pg_cron が本番に入っていないことだった。今回 pg_cron を入れたが、手がかりの削除はそのままにする。

## 範囲の外

- 同じ M0 で、M6 の作業用の表 `m6_fix_20261024` を消した。中身は api の `.context/m6_fix_20261024.csv`（git の管理外）に書き出してある。
