# M18 投稿管理（api） Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** EDITOR が一人の投稿をまとめて無効にし、MANAGER が BAN（viewer への格下げ）と手がかり（IP・端末）での同一人物の見分けができる口を api に足す。

**Architecture:** 手がかりは core の `access-trace` モジュール（Global）が `user_access_traces` に書く。投稿のときは目撃の保存トランザクションの中で、ログイン（Supabase のセッション）は AuthGuard がセッションと IP の組ごとに 1 回だけ書く。役割は RBACGuard がその場で `profiles.role` を読み直す。投稿管理の口は新しいドメイン `src/libs/moderation/` に置く。

**Tech Stack:** NestJS 12・TypeORM 1.x（`createQueryBuilder` のみ）・PostgreSQL（Supabase）・Vitest＋SWC・jose。

**Spec:** `docs/superpowers/specs/2026-11-03-moderation-design.md`

## 計画で決めたこと（spec からの変更・Ruling）

- **backend は触らない。** 登録・ログインの手がかりは api が取る。api の前の CloudFront（`serverless.ts` の `AppCloudFrontDistribution`）は Managed-AllViewerExceptHostHeader（`b689b0a8-…`）で、これは「all device type and viewer location headers」を origin に渡す。`CloudFront-Viewer-Address` は viewer location headers の 1 つ（AWS の「Add CloudFront request headers」「Use managed origin request policies」で確認・2026-11-03）。Lambda の Function URL は `authorizer: 'aws_iam'`＋OAC なので CloudFront を通らない呼び出しはできず、`CloudFront-*` は CloudFront が付け直すので利用者は偽れない。登録・ログインは Supabase のセッションを作るので、登録者のトークン（`session_id` の claim）が api に初めて来たときに `kind = 'session'` で記録すれば、登録とログインの両方を拾える。backend の spec はこの計画で不要になる（ADR に書く）。
- **90 日で消すのは api の中で。** pg_cron は本番で未導入（`installed_version` が null・2026-11-03 確認）。記録のついでに、Lambda の実体ごとに 1 時間に 1 回まで `created_at < now() - interval '90 days'` を消す。読む口も 90 日より古い行を返さない。
- **まとめての無効化は 1 件ずつの無効化を順に呼ぶ。** 今の `OperationSightingV3Service.invalidate` が最新目撃のキャッシュの付け替えを 1 件ずつ正しく扱うので、それを使い回す（spec の「1 トランザクション」は取らない）。途中で失敗したら、そこまでの件数と失敗した id を返す。
- **BAN の後は socket の合図と CDN の失効を出さない。** 役割が変わるだけで画面のデータは変わらない。

## Global Constraints

- 役割は `viewer`・`reporter`・`editor`・`manager` の 4 つ。`READER: 'reader'` を `VIEWER: 'viewer'` に改める。
- BAN ＝ `profiles.role` を `viewer` にする。BAN・解除・手がかりは MANAGER だけ。まとめての無効化と投稿者の要約・一覧・新着は EDITOR と MANAGER（`@RBAC(Role.EDITOR, Role.MANAGER)`。RBAC は階層でなく列挙）。
- 自分と MANAGER は BAN できない。解除は直近の BAN の `from_role` に戻し、記録が無ければ `reporter`。
- 手がかりは 90 日で消す。IPv4 は完全一致、IPv6 は /64 で同じ手がかりとみなす。その IP を使ったアカウントが 10 以上なら `shared: true`。
- 印: 登録して 24 時間以内 → `newAccount`、その目撃までの 1 時間に同じ人の投稿が 5 件以上 → `burst`。
- 匿名（ゲスト）は対象の外。`profiles` も `operation_sighting_authors` も持たない。
- Query は `createQueryBuilder` だけ。anti-join は `NOT EXISTS`。制約名は既定のハッシュ名。migration は `npm run migration:generate`（サンドボックスの外・手元の `.env.local` は本番 DB を読むので generate は読むだけ。`migration:run` はこの計画ではしない）。
- 相対 import に `.js`。モデルを足したら `src/core/configs/entities.ts` にも足す。
- テスト・CLI・migration は SWC なのでサンドボックスの外で流す（`npx vitest run <path>`）。
- コミットは Conventional Commits＋絵文字、ドメイン名は日本語。署名コミットはサンドボックスの外。

## Review Focus

1. `CloudFront-Viewer-Address` が無いリクエスト（手元・テスト）→ 手がかりは書かずに、投稿もログインもふつうに通る。→ Task 1・Task 3 にテスト。
2. BAN された直後（JWT はまだ `reporter`）の投稿 → 403。フラグ `registered_only_posting` が off でも 403。→ Task 2 にテスト。
3. IPv6 の `CloudFront-Viewer-Address`（例 `2001:db8::1:46532`）→ ポート `46532` を落として `2001:db8::1` を記録。→ Task 1 にテスト。
4. まとめての無効化で、すでに無効の目撃・存在しない id が混じる → それらは飛ばして残りを無効にし、`skipped` に入れる。→ Task 5 にテスト。
5. MANAGER が自分・別の MANAGER・すでに viewer の人を BAN しようとする → 400 系の `UseCaseError`。→ Task 6 にテスト。

---

### Task 1: 手がかりの記録（`access-trace` モジュールと表）

**Files:**
- Create: `src/core/modules/access-trace/user-access-trace.model.ts`
- Create: `src/core/modules/access-trace/viewer-address.ts`（＋`.spec.ts`）
- Create: `src/core/modules/access-trace/access-traces.ts`（＋`.spec.ts`）
- Create: `src/core/modules/access-trace/access-trace.module.ts`（`@Global()`。FeatureFlagModule と同じ形）
- Modify: `src/core/configs/entities.ts`（`UserAccessTraceModel` を足す）
- Modify: アプリのルートの module（FeatureFlagModule を import している所）に `AccessTraceModule` を足す
- Create: `db/migrations/<ts>-AddUserAccessTraces.ts`（generate）

**Interfaces:**
- Produces:
  - `UserAccessTraceModel`（表 `user_access_traces`）: `id` uuid PK、`userId` uuid（`auth.users(id)` へ FK・CASCADE・`AuthUserModel` への ManyToOne）、`kind` text（`'post' | 'session'`）、`ip` inet NOT NULL、`userAgent` text NULL、`sessionId` uuid NULL、`operationSightingId` uuid NULL（`operation_sightings(id)` へ FK・SET NULL）、`createdAt` timestamptz。索引: `(userId, createdAt)`、`(ip)`、`(createdAt)`、`(sessionId, ip)` の一意（`kind = 'session'` の部分索引にできなければ普通の一意でよい。`post` は sessionId が NULL なので衝突しない）。
  - `parseViewerAddress(header: string | string[] | undefined): string | null` — 最後の `:` より前を IP とする。`[` `]` があれば外す。空・不正なら null。
  - `readViewerContext(req: Request): { ip: string | null; userAgent: string | null }` — `cloudfront-viewer-address` と `user-agent` を読む。
  - `class AccessTraces`:
    - `recordSession(params: { userId: string; sessionId: string; ip: string; userAgent: string | null }): Promise<void>` — `INSERT … ON CONFLICT DO NOTHING`。同じ Lambda の実体の中では `${sessionId}|${ip}` を Set に覚えて 2 回目から DB に行かない。
    - `recordPost(params: { userId: string; operationSightingId: string; ip: string; userAgent: string | null }, manager: EntityManager): Promise<void>`
    - `purgeExpiredIfDue(now?: Date): Promise<void>` — 前回から 1 時間たっていれば 90 日より古い行を消す。`recordSession` と `recordPost` の後に呼ぶ（失敗は warn で握る）。

- [ ] **Step 1: `viewer-address.spec.ts` を書く**

```ts
expect(parseViewerAddress('198.51.100.10:46532')).toBe('198.51.100.10');
expect(parseViewerAddress('2001:db8::1:46532')).toBe('2001:db8::1');
expect(parseViewerAddress('[2001:db8::1]:46532')).toBe('2001:db8::1');
expect(parseViewerAddress(undefined)).toBeNull();
expect(parseViewerAddress('')).toBeNull();
expect(parseViewerAddress(['203.0.113.24:1', 'x'])).toBe('203.0.113.24');
```

- [ ] **Step 2: `access-traces.spec.ts` を書く**（repository をモック）
  - 「同じ sessionId と ip の 2 回目は DB に書かない」: `recordSession` を 2 回 → insert は 1 回。
  - 「ip が違えば同じセッションでも書く」: insert 2 回。
  - 「purgeExpiredIfDue は 1 時間に 1 回」: `now` を 0 分・30 分・61 分で呼ぶ → delete は 2 回、条件の日時は `now - 90 日`。
- [ ] **Step 3: 落ちるのを確かめる** — `npx vitest run src/core/modules/access-trace`（サンドボックスの外）→ FAIL
- [ ] **Step 4: 実装する**（上の Interfaces どおり。insert・delete は `createQueryBuilder`）
- [ ] **Step 5: 通るのを確かめる** — 同じコマンドで PASS。`npx vitest run src/core/configs/entities.spec.ts` も PASS。
- [ ] **Step 6: migration を作る** — `npm run migration:generate -- db/migrations/AddUserAccessTraces`（サンドボックスの外）。出た SQL に `user_access_traces` の作成・FK 2 本・索引だけがあり、他の表への差分が無いことを目で見る。
- [ ] **Step 7: コミット** — `feat: :sparkles: 投稿とログインの手がかり（IP・端末）を記録する表と部品を足す`

### Task 2: 役割をその場で読み直す・reader を viewer に

**Files:**
- Modify: `src/core/modules/rbac/role.enum.ts`（`READER: 'reader'` → `VIEWER: 'viewer'`）
- Create: `src/core/modules/rbac/current-roles.ts`（＋`.spec.ts`）
- Modify: `src/core/modules/rbac/rbac.guard.ts`（＋`rbac.guard.spec.ts`）
- Modify: `src/core/modules/feature-flag/feature-flag.module.ts` と同じ形の Global な module に `CurrentRoles` を入れる（`TypeOrmModule.forFeature([ProfileModel])`。置き場は `src/core/modules/rbac/current-role.module.ts`）

**Interfaces:**
- Produces: `class CurrentRoles { findRole(userId: string): Promise<Role | null> }` — `profiles.role` を `isRole` で通して返す。行が無ければ null。キャッシュしない。
- RBACGuard の新しい流れ（`requiredRoles` がある口だけ）:
  1. `auth` が無ければ 401（今と同じ）。
  2. `auth.userId` と `auth.role` があれば `CurrentRoles.findRole(auth.userId)` で読み直し、以後はその値を使う（null なら JWT の値のまま）。
  3. 読み直した役割が `viewer` なら、フラグに関係なく 403。
  4. 以降は今と同じ（フラグ off なら通す・含まれなければ 403）。

- [ ] **Step 1: `rbac.guard.spec.ts` に足す**
  - 「JWT は reporter でも DB が viewer なら投稿は 403」
  - 「フラグ off でも DB が viewer なら 403」
  - 「JWT が reporter で DB が editor に上がっていれば EDITOR の口を通す」
  - 「匿名（role null）は DB を読まない」（`findRole` が呼ばれない）
- [ ] **Step 2: FAIL を確かめる** — `npx vitest run src/core/modules/rbac`
- [ ] **Step 3: 実装する**。`Role.READER` を参照している所が無いことを `grep -rn "READER" src` で確かめる。
- [ ] **Step 4: PASS を確かめる**、`npx vitest run` 全体も PASS。
- [ ] **Step 5: コミット** — `feat: :sparkles: 役割を毎回 profiles から読み直し、viewer は書き込めなくする`

### Task 3: 投稿とセッションで手がかりを書く

**Files:**
- Modify: `src/core/modules/auth/auth-context.ts`（`sessionId: string | null` を足す）
- Modify: `src/core/modules/auth/auth.guard.ts`（＋spec）
- Modify: `src/libs/operation-sighting/presentation/operation-sighting.v3.controller.ts`（`post` で `readViewerContext(req)` を渡す）
- Modify: `src/libs/operation-sighting/usecase/operation-sighting.v3.service.ts`（`post` の params に `viewer: { ip: string | null; userAgent: string | null }`。トランザクションの中、`operationSightingAuthorCommand.create` の直後に `ip` があれば `accessTraces.recordPost`）（＋spec）

**Interfaces:**
- Consumes: Task 1 の `AccessTraces`・`readViewerContext`。
- AuthGuard: 検証に通り、`role` が null でなく、`payload.session_id` が文字列で、`readViewerContext(req).ip` が null でなければ `recordSession` を await。例外は warn（「手がかりの記録に失敗しました」）で握り、認証は通す。

- [ ] **Step 1: テストを書く**
  - auth.guard.spec: 「登録者のトークンと CloudFront-Viewer-Address があれば recordSession を session_id・IP・UA で呼ぶ」「匿名（user_role なし）は呼ばない」「ヘッダーが無ければ呼ばない」「recordSession が失敗しても true を返す」。
  - service spec: 「userId と ip があればトランザクションの中で recordPost を呼ぶ」「ip が null なら呼ばないが投稿は保存する」「userId が null（匿名）なら呼ばない」。
- [ ] **Step 2: FAIL を確かめる**
- [ ] **Step 3: 実装する**
- [ ] **Step 4: PASS（全体も）を確かめる**
- [ ] **Step 5: コミット** — `feat: :sparkles: 目撃の投稿と登録者のセッションで手がかりを記録する`

### Task 4: 投稿管理のドメインと読み取りの口

**Files:**
- Create: `src/libs/moderation/` 一式（`moderation.libs.module.ts`・`moderation.v3.module.ts`・`presentation/moderation.v3.controller.ts`・`usecase/moderation.v3.service.ts`・`usecase/dtos/*`・`infrastructure/queries/moderation.query.ts`）
- Modify: `src/routes/api/v3/api-v3.module.ts`（`path: '/moderation'` を足す）
- Test: `src/libs/moderation/infrastructure/queries/moderation.query.spec.ts`・`usecase/moderation.v3.service.spec.ts`・`presentation/moderation.v3.controller.spec.ts`

**Interfaces（口。controller は `@UseGuards(AuthGuard, RBACGuard)`）:**
- `GET /v3/moderation/users/:userId` — EDITOR・MANAGER → `ModerationUserSummaryDto { userId; username; displayName; role; createdAt; sightingCount; invalidatedCount; firstSightingAt: string | null; lastSightingAt: string | null; banned: boolean }`。`banned` は `role === 'viewer'` かつ `user_role_changes` に `to_role = 'viewer'` の行があること（Task 6 の表。Task 4 の時点では `role === 'viewer'` だけで判定し、Task 6 で直す）。profiles が無ければ 404。
- `GET /v3/moderation/users/:userId/sightings?limit=100&before=<ISO>` — EDITOR・MANAGER → `ModerationSightingDto[] { operationSightingId; sightingTime; createdAt; operationNumber; formationNumber; invalidated: boolean; invalidatedBy: { userId; username } | null }`。新しい順（`created_at DESC`）。`limit` は 1〜200・既定 100。
- `GET /v3/moderation/sightings/:id/author` — EDITOR・MANAGER → `{ userId: string | null }`。
- `GET /v3/moderation/recent-sightings?limit=100&before=<ISO>` — EDITOR・MANAGER → `ModerationRecentSightingDto[]`（上の `ModerationSightingDto` に `author: { userId; username; displayName; role; newAccount: boolean; burst: boolean } | null` を足したもの。ゲストは `author: null`）。
- 閾値は `moderation.constants.ts` に `NEW_ACCOUNT_HOURS = 24`・`BURST_COUNT = 5`・`BURST_WINDOW_MINUTES = 60`。

- [ ] **Step 1: テストを書く**
  - query spec（実 DB でなく SQL の形を見る既存の query spec に倣う）: 「投稿者の目撃は created_at の新しい順」「新着の burst はその目撃までの 60 分で 5 件以上」。
  - controller spec: 「4 つの口は REPORTER で 403・EDITOR で 200」。
  - service spec: 「profiles の無い userId は 404 の UseCaseError」「ゲストの目撃は author が null」。
- [ ] **Step 2: FAIL → Step 3: 実装 → Step 4: PASS（全体も）**
- [ ] **Step 5: 手元で叩く**（`docker restart sotetsu-lab-v3-api-development-api-1` の後、本番 DB を読む手元の api に EDITOR のトークンで `GET /v3/moderation/recent-sightings?limit=5`）→ 200 で投稿者つきの 5 件。トークンは変数だけで扱い、ファイルに書かない（api の `.context/prod_check.sh` に倣う）。
- [ ] **Step 6: コミット** — `feat: :sparkles: 投稿管理の読み取りの口（投稿者の要約・目撃・新着）を足す`

### Task 5: まとめての無効化

**Files:**
- Modify: `src/libs/moderation/presentation/moderation.v3.controller.ts`・`usecase/moderation.v3.service.ts`（＋spec）
- Modify: `src/libs/moderation/moderation.v3.module.ts`（`OperationSightingV3Service` を使えるようにする。`OperationSightingV3Module` から export するか、moderation の module に必要な libs を import して provider に足すかは実装者。循環させない）

**Interfaces:**
- `POST /v3/moderation/sightings/invalidate` — EDITOR・MANAGER。body `{ ids: string[] (1〜200・uuid); reason: string (1〜200 字) }` → `{ invalidated: string[]; skipped: { id: string; reason: 'not_found' | 'already_invalidated' }[]; failed: { id: string; message: string } | null }`。
- 中身: `ids` を順に `OperationSightingV3Service.invalidate({ operationSightingId, userId: req.auth.userId, reason })`。`UseCaseError` の `not_found` と、すでに無効のものは `skipped`。それ以外の例外が出たらそこで止め、`failed` に入れて返す（200）。

- [ ] **Step 1: テストを書く** — 「すでに無効と存在しない id は skipped・残りは invalidated」「3 件目で予期しない例外なら 2 件が invalidated・failed に 3 件目」「201 件は 400」「REPORTER は 403」。
- [ ] **Step 2〜4: FAIL → 実装 → PASS**
- [ ] **Step 5: コミット** — `feat: :sparkles: 目撃をまとめて無効にする口を足す`

### Task 6: BAN・解除と手がかりの口

**Files:**
- Create: `src/libs/moderation/infrastructure/models/user-role-change.model.ts`、`infrastructure/command/user-role-change.command.ts`、`domain/moderation-target.domain.ts`（＋spec）
- Modify: `src/core/configs/entities.ts`、controller・service・query（＋spec）
- Create: `db/migrations/<ts>-AddUserRoleChanges.ts`（generate）

**Interfaces:**
- `UserRoleChangeModel`（表 `user_role_changes`）: `id` uuid、`userId`（FK `auth.users`・CASCADE）、`changedBy`（FK `auth.users`）、`fromRole` text、`toRole` text、`reason` text NULL、`createdAt`。索引 `(userId, createdAt)`。
- `class ModerationTarget`（domain・既存の `*.domain.ts` のクラスの書き方に倣う）: `static create({ userId, role, lastBanFromRole: string | null })`、`ban(by: { userId: string }, reason: string): RoleChange`、`unban(by: { userId: string }, reason: string | null): RoleChange`。規則: 自分は不可・`manager` は不可・すでに `viewer` は不可・reason は 1〜200 字（BAN のとき必須）。解除は `viewer` のときだけ、戻す先は `lastBanFromRole ?? 'reporter'`。違反は `UseCaseError`（reason コード `self`・`manager`・`already_banned`・`not_banned`・`reason_required`）。
- `POST /v3/moderation/users/:userId/ban` — MANAGER。body `{ reason: string }` → `ModerationUserSummaryDto`。`profiles.role` の更新と `user_role_changes` の insert を 1 トランザクション。
- `POST /v3/moderation/users/:userId/unban` — MANAGER。body `{ reason?: string }` → 同上。
- `GET /v3/moderation/users/:userId/traces` — MANAGER → `ModerationTraceDto[] { ip: string /* IPv6 は /64 の網 */; userAgents: string[]; count: number; lastSeenAt: string; accountCount: number; shared: boolean /* accountCount >= 10 */; otherAccounts: { userId; username; role; banned: boolean }[] /* 自分を除く・最大 20 */ }`。90 日より古い行は見ない。IP の束ね方は `CASE WHEN family(ip) = 6 THEN network(set_masklen(ip, 64)) ELSE host(ip)::inet END`。
- Task 4 の `banned` を「`role = 'viewer'` かつ `user_role_changes` に `to_role = 'viewer'` がある」に直す。

- [ ] **Step 1: テストを書く**
  - domain spec: Review Focus 5 の 3 件＋「解除は直近の from_role に戻す」「BAN の記録が無い viewer の解除は reporter」。
  - controller spec: 「ban・unban・traces は EDITOR で 403・MANAGER で 200」。
  - query spec: 「traces は IPv6 を /64 で束ねる」「otherAccounts に自分を入れない」「90 日より古い行を数えない」。
- [ ] **Step 2〜4: FAIL → 実装 → PASS（全体も）**
- [ ] **Step 5: migration を作る**（Task 1 と同じ手順・差分は `user_role_changes` だけ）
- [ ] **Step 6: コミット** — `feat: :sparkles: 投稿者の BAN・解除と手がかりの口を足す`

### Task 7: ADR と CLAUDE.md

**Files:**
- Create: `docs/adr/0013-moderation.md`（ADR-0009 と同じ見出し: 日時・Agent・ステータス・ブランチ・spec／背景／決定／根拠／却下した案／影響）
- Modify: `CLAUDE.md`（「開発上の注意点」に手がかりの記録と RBACGuard の読み直しを 2〜3 行）
- Modify: spec の「出す順」を、backend を外した形に直す（`docs/superpowers/specs/2026-11-03-moderation-design.md`）

- [ ] **Step 1: 書く**。ADR に入れること: この計画の「計画で決めたこと」4 点、`CloudFront-Viewer-Address` を信じてよい理由（Function URL は aws_iam＋OAC）、デプロイ後に本番で確かめること（下）、本番で流す migration 2 本（`migration:run` はユーザー）。
- [ ] **Step 2: コミット** — `docs: :memo: 投稿管理（M18）の ADR を書く`

## デプロイ後に本番で確かめること（計画の外・ユーザーと一緒に）

1. client のプライバシーポリシー（#273＋追記）が先に出ていること。
2. migration 2 本をユーザーが `migration:run`（api のデプロイの前）。
3. デプロイ後、自分のアカウントでログインして 1 件投稿 → `user_access_traces` に `session` と `post` が 1 行ずつ、`ip` が自分の回線の IP（AWS の IP でない）であること。AWS の IP なら `CloudFront-Viewer-Address` が届いていない → 記録を止めて相談（spec 5 章）。
