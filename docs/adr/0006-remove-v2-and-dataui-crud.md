# ADR-0006: v2 を廃止し @dataui/crud を外す

- **日時**: 2026-10-21
- **Agent**: claude-opus-5-5
- **ステータス**: 採用済み
- **ブランチ**: refactor/remove-v2-and-dataui-crud
- **spec**: docs/superpowers/specs/2026-10-20-remove-v2-and-dataui-crud-design.md

---

## 背景

- `@dataui/crud` は 5.3.4（2024-04）で更新が止まり、NestJS 11 / 12 で動く保証が無い。NestJS を上げる前に依存から外す必要があった。
- `@dataui/crud` の検索（`CrudRequest`）を使っていたのは v2 の口だけ。v3 の query・command は `TypeOrmCrudService` を継承していたが、継承から使っていたのは v2 用のメソッドだけだった。

## 決定

- `/v2/*` を廃止する。12 ドメインの v2 の module・controller・service と、v2 からしか使われていなかった部品を消す。
- `@dataui/crud`・`@dataui/crud-request`・`@dataui/crud-typeorm` を依存から外す。query・command は `@InjectRepository` の Repository と `createQueryBuilder` だけで書く。

## 根拠（2026-10-20 時点）

- client・backend・socket のどのリポも `/v2/` を呼んでいない。
- 本番 api の Lambda ログ 30 日分で、`/v2/` は確認用の curl だけ。
- Supabase Auth への切り替え（ADR-0005）以降、v2 は Supabase のトークンが無いと 401。そのトークンを取れるのは v3 の client だけなので、外部の利用者がいたとしても既に使えない。

## 却下した案

- v2 を先に 410 Gone にして数週間置く（外部の利用者がもう v2 を叩けないので、待っても得る情報が無い）。
- v2 だけ先に消し、`@dataui/crud` は後の PR で外す（デプロイと確認が 2 回になる）。

## 影響

- `/v2/*` は 404（`Cache-Control: no-store`）。v3 の URL・応答・Cache-Control・認証は変わらない（本番ログの v3 の GET 65 本を手元と本番で突き合わせて一致）。
- v2 の応答が CloudFront に最長 30 日キャッシュされる件（`private` が付かない）は、デプロイ後に `/v2/*` を CloudFront で invalidation して解消する。オリジンが 404 を返すようになっても、エッジに残った 200 は期限まで返り続けるため（cache policy は MaxTTL 1 年・ヘッダーをキーに含めない）。
- 版は major（v4.0.0）。`/v2/*` を消すのは後方互換の無い変更のため。v2 を消すコミットは `refactor!` で、本文に BREAKING CHANGE を書いた。
