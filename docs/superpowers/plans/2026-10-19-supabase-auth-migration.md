# 認証基盤を Supabase Auth に移す 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cognito と backend の自前ユーザー・セッションをやめ、利用者ごとの Supabase JWT で api・socket が人と役割を見分けられるようにする（読み取りはトークン不要）。

> 2026-10-20 追記: socket・client・backend の Task（4〜13）は、それぞれのリポジトリの計画に移した。実装のあとで「読み取りもトークン必須・ゲストは匿名セッション・socket もトークン必須」に変えた。この計画の「トークン不要」は当時の記録で、今の形は spec が正。

**Architecture:** client は Supabase を知らない。backend が Supabase Auth にログイン・登録・更新・ログアウトを代わりに行い、トークンは HttpOnly Cookie に入れる（セッションの正本は Supabase の `auth.sessions`）。api・socket は Supabase の JWKS で検証し、`user_role` claim（Custom Access Token Hook が `public.profiles.role` から入れる）で RBAC をかける。切り替えの途中は Cognito も受け付ける。

**Tech Stack:** NestJS 10 + TypeORM（api・osls・nodejs24.x）/ middy（backend は osls・nodejs24.x に上げる。socket は serverless 3・nodejs20.x のまま）/ Angular 22（client）/ `jose` ^6.2.12（Supabase の JWT の検証。ESM 専用だが api の実行環境は Node 24 なので require できる）/ `aws-jwt-verify` 4.0.1（切り替えの途中の Cognito の検証だけ。切り替え手順の 6 で外す）/ `@supabase/supabase-js` ^2.118.0（Node 22 以上が必要）/ jest（api・client）/ vitest（socket・backend）

**Spec:** `docs/superpowers/specs/2026-10-19-supabase-auth-migration-design.md`（api リポジトリ）。実装者は spec を必ず読むこと。

## Global Constraints

- Supabase プロジェクト: `nofubcikiabamlnlxpko`。`SUPABASE_URL` = `https://nofubcikiabamlnlxpko.supabase.co`
- access token の `iss` = `${SUPABASE_URL}/auth/v1`、`aud` = `authenticated`、役割は claim `user_role`（`reporter` / `editor` / `manager`）
- ダミーのメールアドレス: `{username を小文字にしたもの}@users.sotetsu-lab.invalid`。変換は backend の `AuthEmail.fromUsername` 1 か所だけ
- Cookie: `sb-access`・`sb-refresh` は `HttpOnly; Secure; SameSite=Lax; Domain=sotetsu-lab.com; Path=/api`。`loggedIn` は今と同じ（`httpOnly: false`）。旧 `sessionId` は login・logout・ゲスト判定のときに消す
- `/api/auth/token`: ログイン中は 200 `{ accessToken, tokenType: 'Bearer', expiresAt }`、ゲストは 204。`Cache-Control: no-store`
- 切れかけの判定: `exp - 60 秒` を過ぎたら更新する
- ユーザー名の重複は 422 `User already exists.`（今と同じ）。ログインの失敗は 401 `Unauthorized.`（今と同じ）。Supabase に届かないときは 503
- socket のゲスト: `token` が `guest`・`null`・`undefined`・空ならゲストとして Allow（API Gateway の identitySource が値無しを 401 にするため、client はゲストで `?token=guest` を送る）
- Supabase の MCP は読み取り専用。Supabase への書き込み（ダッシュボードの設定・`migration:run`）と AWS への書き込み（SSM・デプロイ）は**ユーザーが行うか、ユーザーの承認を得て行う**
- コミットは Conventional Commits＋絵文字（例 `feat: :sparkles: …`）。GPG 署名のためサンドボックスの外でコミットし、`git log --show-signature -1` で署名を確かめる
- client の jest は `npx jest --testPathPattern <path>`（`npm test` は sandbox で落ちる）
- 手元の api・backend は**本番の DB と本番の Supabase** につながる。手元で作る検証用の利用者は 1 人だけにして、終わったら消す
- backend の Lambda は nodejs24.x（api と同じ）。Serverless Framework は `serverless` 3.38（nodejs20.x までしか知らない）から `osls` ^3.61.1（api と同じ・MIT）に替える
- 依存の版上げは、この計画を通すのに要るなら行ってよい（ユーザー承認済み。例: jose の型が読めない TypeScript 4.7、Node 24 で起動しない serverless-offline・esbuild 系のプラグイン）。上げたら build と全テストを通し、`build: :arrow_up: …` の別コミットにする。要らない版上げはしない
- `jose` は api・socket とも `import { createRemoteJWKSet, jwtVerify } from 'jose'` だけを使う。テストでは `jest.mock('jose', factory)`／`vi.mock('jose', factory)` で差し替える（jest は ESM 専用のパッケージを読み込めないため、実物を読ませない）

## Review Focus

- 期限切れの `sb-access` だけが残り `sb-refresh` が無い Cookie → ゲスト（204）にして Cookie を消す（Task 7 のテストで固定）
- 同じ refresh token で 2 タブが同時に `/api/auth/token` を呼ぶ → Supabase の 10 秒の猶予で両方 200 になる前提。backend 側で失効扱いにしない（一時的な失敗＝503 と、無効＝204 を分ける。Task 7）
- SW に残った古い client が socket に `token=null` を送る → ゲストとして Allow（Task 4）
- 大文字を含むユーザー名でのログイン・登録 → 小文字のメールアドレスで照合し、表示名は元の書き方（Task 6・Task 9・Task 10）
- api の GET に壊れた・Cognito の古いトークンが付いてくる → 途中期間は Cognito を通す・壊れたものは 401（client は 1 回取り直す既存の動き）（Task 3）

---

## ブランチ

| リポジトリ | ブランチ | 元 |
|---|---|---|
| api | `feature/supabase-auth`（作成済み） | master |
| socket | `feature/supabase-auth`（作成済み。未マージだった `refactor/phase-0-to-4` の名前を変えて再利用。vitest の基盤・pino の 2 コミットも一緒に出る。ユーザー承認済み） | master＋2 コミット |
| backend | `feature/supabase-auth` | master |
| client | `feature/supabase-auth` | master |

backend・client は master から切り、最初に `git commit --allow-empty -m "first commit"` を置く（サンドボックスの外で）。api・socket は作成済み。

---

### Task 1: Supabase とSSM の準備（ユーザーの手作業）

**Files:** なし（ダッシュボードと AWS）

実装者はこの Task を実行しない。ユーザーに次の手順を渡し、終わった報告を受けてから Task 2 以降の「本番に触れる手順」に進む。コードを書く手順は先に進めてよい。

- [ ] **Step 1: JWT の署名鍵を非対称にする**

  ダッシュボード → Project Settings → JWT Keys → 「Migrate JWT secret」→ standby の鍵を **ECC (P-256)** で作る → 「Rotate keys」。
  確認（サンドボックス外でもよい）:

  ```bash
  curl -s https://nofubcikiabamlnlxpko.supabase.co/auth/v1/.well-known/jwks.json
  ```

  Expected: `"keys":[{"alg":"ES256", ...}]` が 1 つ以上。
  旧来の HS256 の秘密鍵は**失効させない**（API は Supabase の JWT を Task 3 から検証するので、旧鍵で署名されたトークンはまだ存在しない。失効は不要）。

- [ ] **Step 2: API キー（新方式）を作る**

  ダッシュボード → Project Settings → API Keys → publishable key と secret key を作る（`sb_publishable_…`・`sb_secret_…`）。

- [ ] **Step 3: Auth の設定**

  - Authentication → Sign In / Providers → 「Allow new users to sign up」を**オフ**
  - Email provider → 「Confirm email」を**オフ**
  - Sessions の refresh token の reuse interval は既定（10 秒）のまま

- [ ] **Step 4: SSM パラメータを作る**（ap-northeast-1、`aws-vault exec administrator --`）

  ```bash
  aws ssm put-parameter --name sotetsu-lab-v3-supabase-url --type String --value https://nofubcikiabamlnlxpko.supabase.co
  aws ssm put-parameter --name sotetsu-lab-v3-supabase-publishable-key --type SecureString --value <sb_publishable_…>
  aws ssm put-parameter --name sotetsu-lab-v3-supabase-secret-key --type SecureString --value <sb_secret_…>
  ```

- [ ] **Step 5: 手元の env に足す**

  - backend `.env`（serverless-offline-ssm が読む・git 管理外）に `sotetsu-lab-v3-supabase-url=…`・`sotetsu-lab-v3-supabase-publishable-key=…`・`sotetsu-lab-v3-supabase-secret-key=…`
  - api `.env.local` に `SUPABASE_URL=https://nofubcikiabamlnlxpko.supabase.co`
  - socket `.env.local`・`.env.dev`・`.env.prod` に `SUPABASE_URL=https://nofubcikiabamlnlxpko.supabase.co`

---

### Task 2: profiles 表と Custom Access Token Hook（api）

**Files:**
- Create: `src/libs/user/infrastructure/models/profile.model.ts`
- Create: `db/migrations/<timestamp>-CreateProfiles.ts`（`migration:generate` で作り、SQL を書き足す）

**Interfaces:**
- Produces: 表 `public.profiles(user_id uuid PK, username text UNIQUE, display_name text, role text, created_at timestamptz, updated_at timestamptz)`・関数 `public.custom_access_token_hook(event jsonb)`。backend（Task 9・11・12・13）がこの列名で読み書きする

- [ ] **Step 1: モデルを書く**

```ts
// src/libs/user/infrastructure/models/profile.model.ts
import {
    Column,
    CreateDateColumn,
    Entity,
    PrimaryColumn,
    UpdateDateColumn,
} from 'typeorm';

/**
 * 利用者の表示名と役割。利用者そのもの（パスワード・セッション）は Supabase Auth の auth.users が持つ。
 * user_id は auth.users(id) への外部キー（マイグレーションで張る。TypeORM は auth スキーマを扱わない）。
 * role は Custom Access Token Hook が JWT の user_role に入れる。
 */
@Entity({ name: 'profiles' })
export class ProfileModel {
    @PrimaryColumn('uuid')
    userId: string;

    /** ログインに使う名前を小文字にしたもの。ダミーのメールアドレスの前半と同じ */
    @Column('text', { unique: true })
    username: string;

    /** 元の書き方のユーザー名 */
    @Column('text')
    displayName: string;

    @Column('text')
    role: string;

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    updatedAt: Date;
}
```

- [ ] **Step 2: マイグレーションを作る**（サンドボックスの外。sandbox 内は Supabase の DNS を引けない）

Run: `npm run migration:generate -- db/migrations/CreateProfiles`
Expected: `db/migrations/<timestamp>-CreateProfiles.ts` ができ、`CREATE TABLE "profiles"` と一意制約だけが入っている（ほかの表への差分が出たら止めてユーザーに報告する）。

- [ ] **Step 3: 生成されたファイルの `up` の末尾と `down` の先頭に SQL を書き足す**

`up` の最後に:

```ts
        await queryRunner.query(`ALTER TABLE "profiles" ADD CONSTRAINT "FK_profiles_user_id_auth_users" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE`);
        await queryRunner.query(`ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY`);
        await queryRunner.query(`REVOKE ALL ON TABLE "profiles" FROM anon, authenticated`);
        await queryRunner.query(`GRANT SELECT ON TABLE "profiles" TO supabase_auth_admin`);
        await queryRunner.query(`CREATE POLICY "auth admin reads profiles" ON "profiles" AS PERMISSIVE FOR SELECT TO supabase_auth_admin USING (true)`);
        await queryRunner.query(`
            CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
            RETURNS jsonb
            LANGUAGE plpgsql
            STABLE
            AS $$
            DECLARE
                claims jsonb;
                profile_role text;
            BEGIN
                SELECT role INTO profile_role FROM public.profiles WHERE user_id = (event->>'user_id')::uuid;
                claims := event->'claims';
                IF profile_role IS NOT NULL THEN
                    claims := jsonb_set(claims, '{user_role}', to_jsonb(profile_role));
                END IF;
                RETURN jsonb_set(event, '{claims}', claims);
            END;
            $$
        `);
        await queryRunner.query(`GRANT USAGE ON SCHEMA public TO supabase_auth_admin`);
        await queryRunner.query(`GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin`);
        await queryRunner.query(`REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public`);
```

`down` の最初に:

```ts
        await queryRunner.query(`DROP FUNCTION IF EXISTS public.custom_access_token_hook(jsonb)`);
        await queryRunner.query(`DROP POLICY IF EXISTS "auth admin reads profiles" ON "profiles"`);
        await queryRunner.query(`ALTER TABLE "profiles" DROP CONSTRAINT "FK_profiles_user_id_auth_users"`);
```

- [ ] **Step 4: 型と build を確かめる**

Run: `npm run build`
Expected: エラー無し

- [ ] **Step 5: Commit**

```bash
git add src/libs/user/infrastructure/models/profile.model.ts db/migrations/*-CreateProfiles.ts
git commit -m "feat: :sparkles: 利用者の表示名と役割を持つ profiles 表と JWT に役割を入れる hook を足す"
```

- [ ] **Step 6: 本番に流す（ユーザーの承認を得てから。サンドボックスの外）**

Run: `npm run migration:run`
そのあとユーザーに、ダッシュボード → Authentication → Hooks → Custom Access Token → Postgres function `public.custom_access_token_hook` を有効にしてもらう。
確認（Supabase MCP `execute_sql`）:

```sql
select count(*) from public.profiles;
select proname from pg_proc where proname = 'custom_access_token_hook';
```

Expected: `0` と `custom_access_token_hook`

---

### Task 3: api の Guard を「読み取りはトークン不要・Supabase と Cognito の両方を受け付ける」にする

**Files:**
- Modify: `package.json`（`jose` ^6.2.12 を足す。`aws-jwt-verify` は 4.0.1 のまま）
- Modify: `src/core/modules/rbac/role.enum.ts`
- Create: `src/core/modules/auth/auth-context.ts`
- Create: `src/core/modules/auth/jwt-issuer.ts`
- Modify: `src/core/modules/auth/auth.guard.ts`
- Modify: `src/core/modules/rbac/rbac.guard.ts`
- Modify: `src/core/types/express.d.ts`
- Modify: `serverless.ts`（environment に `SUPABASE_URL`）
- Test: `src/core/modules/auth/auth.guard.spec.ts`・`src/core/modules/rbac/rbac.guard.spec.ts`

**Interfaces:**
- Produces: `Request.auth?: AuthContext`（`{ userId: string | null; role: Role | null }`）。`Role` は `'reader' | 'reporter' | 'editor' | 'manager'`。② の目撃の投稿者記録は `req.auth.userId` を使う

- [ ] **Step 1: jose を入れる**

Run: `npm install jose@^6.2.12`（allowed_domains: registry.npmjs.org）
Run: `npm run build`
Expected: エラー無し（jose の型定義が TypeScript 4.7 で読めず型エラーが出たら、TypeScript と関連（ts-jest・ts-node・@typescript-eslint）を読める版まで上げ、`npm run build`・`npx jest` を通して `build: :arrow_up: TypeScript を上げる` の別コミットにする）
Run: `node -e "require('jose'); console.log('ok')"`（api の docker コンテナの中＝Node 24 で）
Expected: `ok`（ESM 専用の jose を CommonJS から require できる）

- [ ] **Step 2: Role と AuthContext と issuer の読み出しを書く**

```ts
// src/core/modules/rbac/role.enum.ts
export const Role = {
    READER: 'reader',
    REPORTER: 'reporter',
    EDITOR: 'editor',
    MANAGER: 'manager',
} as const;
export type Role = (typeof Role)[keyof typeof Role];

const ROLES: readonly string[] = Object.values(Role);

export const isRole = (value: unknown): value is Role =>
    typeof value === 'string' && ROLES.includes(value);
```

```ts
// src/core/modules/auth/auth-context.ts
import { Role } from '../rbac/role.enum';

/** 検証済みトークンから分かった利用者。Cognito の共有トークン（切り替えの途中だけ）は userId が無い */
export type AuthContext = {
    userId: string | null;
    role: Role | null;
};
```

```ts
// src/core/modules/auth/jwt-issuer.ts
/** 署名を確かめる前に、どの発行元の verifier に回すかだけを決めるため iss を読む。信用はしない */
export const readUnverifiedIssuer = (jwt: string): string | null => {
    const payload = jwt.split('.')[1];
    if (!payload) return null;
    try {
        const json = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
        return typeof json.iss === 'string' ? json.iss : null;
    } catch {
        return null;
    }
};
```

- [ ] **Step 3: AuthGuard の失敗するテストを書く**

```ts
// src/core/modules/auth/auth.guard.spec.ts
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';

// jose は ESM 専用で jest が読めないので、実物を読ませずに差し替える
const supabaseVerify = jest.fn();
jest.mock('jose', () => ({
    createRemoteJWKSet: () => 'jwks',
    jwtVerify: (...args: unknown[]) => supabaseVerify(...args),
}));
const cognitoVerify = jest.fn();
jest.mock('aws-jwt-verify', () => ({
    CognitoJwtVerifier: {
        create: () => ({ verify: cognitoVerify, cacheJwks: jest.fn() }),
    },
}));

process.env.SUPABASE_URL = 'https://example.supabase.co';
const SUPABASE_ISS = 'https://example.supabase.co/auth/v1';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { AuthGuard } = require('./auth.guard');

const jwtWithIss = (iss: string) =>
    `x.${Buffer.from(JSON.stringify({ iss })).toString('base64url')}.y`;

const contextFor = (headers: Record<string, string>) => {
    const req: Record<string, unknown> = { headers };
    const ctx = {
        switchToHttp: () => ({ getRequest: () => req }),
    } as unknown as ExecutionContext;
    return { req, ctx };
};

describe('AuthGuard', () => {
    beforeEach(() => jest.clearAllMocks());

    it('ヘッダーが無ければ auth を付けずに通す', async () => {
        const { req, ctx } = contextFor({});
        await expect(new AuthGuard().canActivate(ctx)).resolves.toBe(true);
        expect(req.auth).toBeUndefined();
    });

    it('Supabase の JWT なら sub と user_role を auth に入れる', async () => {
        supabaseVerify.mockResolvedValueOnce({ payload: { sub: 'u-1', user_role: 'editor' } });
        const { req, ctx } = contextFor({
            'x-sotetsu-lab-authorization': `Bearer ${jwtWithIss(SUPABASE_ISS)}`,
        });
        await expect(new AuthGuard().canActivate(ctx)).resolves.toBe(true);
        expect(req.auth).toEqual({ userId: 'u-1', role: 'editor' });
    });

    it('Supabase の JWT で user_role が無ければ role は null', async () => {
        supabaseVerify.mockResolvedValueOnce({ payload: { sub: 'u-2' } });
        const { req, ctx } = contextFor({
            authorization: `Bearer ${jwtWithIss(SUPABASE_ISS)}`,
        });
        await new AuthGuard().canActivate(ctx);
        expect(req.auth).toEqual({ userId: 'u-2', role: null });
    });

    it('Cognito のトークンは scope の末尾を role にし、userId は null', async () => {
        cognitoVerify.mockResolvedValueOnce({
            sub: 'client-id',
            scope: 'sotetsu-lab-v3-api/reporter',
        });
        const { req, ctx } = contextFor({
            'x-sotetsu-lab-authorization': `Bearer ${jwtWithIss('https://cognito-idp.ap-northeast-1.amazonaws.com/pool')}`,
        });
        await new AuthGuard().canActivate(ctx);
        expect(req.auth).toEqual({ userId: null, role: 'reporter' });
    });

    it('Cognito の fullaccess は role を持たない', async () => {
        cognitoVerify.mockResolvedValueOnce({
            sub: 'client-id',
            scope: 'sotetsu-lab-v3-api/fullaccess',
        });
        const { req, ctx } = contextFor({
            'x-sotetsu-lab-authorization': `Bearer ${jwtWithIss('https://cognito-idp.ap-northeast-1.amazonaws.com/pool')}`,
        });
        await new AuthGuard().canActivate(ctx);
        expect(req.auth).toEqual({ userId: null, role: null });
    });

    it('検証に失敗したら 401', async () => {
        supabaseVerify.mockRejectedValueOnce(new Error('expired'));
        const { ctx } = contextFor({
            'x-sotetsu-lab-authorization': `Bearer ${jwtWithIss(SUPABASE_ISS)}`,
        });
        await expect(new AuthGuard().canActivate(ctx)).rejects.toBeInstanceOf(
            UnauthorizedException,
        );
    });

    it('JWT の形をしていなければ 401', async () => {
        cognitoVerify.mockRejectedValueOnce(new Error('malformed'));
        const { ctx } = contextFor({
            'x-sotetsu-lab-authorization': 'Bearer not-a-jwt',
        });
        await expect(new AuthGuard().canActivate(ctx)).rejects.toBeInstanceOf(
            UnauthorizedException,
        );
    });
});
```

- [ ] **Step 4: 失敗を確かめる**

Run: `npx jest src/core/modules/auth/auth.guard.spec.ts`
Expected: FAIL（ヘッダー無しで 401 になる・`req.auth` が無い）

- [ ] **Step 5: AuthGuard を書き換える**

```ts
// src/core/modules/auth/auth.guard.ts
import {
    CanActivate,
    ExecutionContext,
    Injectable,
    Logger,
    UnauthorizedException,
} from '@nestjs/common';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { Request } from 'express';
import { readFileSync } from 'fs';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { isRole } from '../rbac/role.enum';
import { AuthContext } from './auth-context';
import { readUnverifiedIssuer } from './jwt-issuer';

const supabaseIssuer = `${process.env.SUPABASE_URL}/auth/v1`;

/** 公開鍵は Lambda の 1 実体の中で持ち回る（jose が取得とキャッシュをする） */
const supabaseJwks = createRemoteJWKSet(
    new URL(`${supabaseIssuer}/.well-known/jwks.json`),
);

/** 切り替えの途中だけ受け付ける（spec 9 章の 2〜6）。6 で aws-jwt-verify ごと消す */
const cognitoVerifier = CognitoJwtVerifier.create({
    userPoolId: process.env.COGNITO_USERPOOL_ID,
    clientId: process.env.COGNITO_CLIENT_ID,
    tokenUse: 'access',
});
cognitoVerifier.cacheJwks(
    JSON.parse(readFileSync(__dirname + '/jwks.json', { encoding: 'utf-8' })),
);

const COGNITO_SCOPE_PREFIX = 'sotetsu-lab-v3-api/';

/**
 * トークンが無ければ何も付けずに通す（読み取りはトークン不要）。
 * あれば検証して req.auth に利用者と役割を入れ、失敗なら 401。役割を求めるのは RBACGuard。
 */
@Injectable()
export class AuthGuard implements CanActivate {
    readonly #logger = new Logger(AuthGuard.name);

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const req = context.switchToHttp().getRequest<Request>();
        const authHeader =
            req.headers['x-sotetsu-lab-authorization'] ??
            req.headers.authorization ??
            '';
        const jwt = (
            Array.isArray(authHeader) ? authHeader[0] : authHeader
        ).replace('Bearer ', '');

        if (!jwt) {
            return true;
        }

        try {
            req.auth = await this.#verify(jwt);
            return true;
        } catch (e) {
            this.#logger.error(e.message, e.stack);
            throw new UnauthorizedException();
        }
    }

    async #verify(jwt: string): Promise<AuthContext> {
        if (readUnverifiedIssuer(jwt) === supabaseIssuer) {
            const { payload } = await jwtVerify(jwt, supabaseJwks, {
                issuer: supabaseIssuer,
                audience: 'authenticated',
            });
            return {
                userId: payload.sub ?? null,
                role: isRole(payload.user_role) ? payload.user_role : null,
            };
        }

        const payload = await cognitoVerifier.verify(jwt);
        const scope = String(payload.scope ?? '').replace(COGNITO_SCOPE_PREFIX, '');
        return { userId: null, role: isRole(scope) ? scope : null };
    }
}
```

```ts
// src/core/types/express.d.ts
import { AuthContext } from '../modules/auth/auth-context';

declare global {
    namespace Express {
        interface Request {
            auth?: AuthContext;
        }
    }
}

export {};
```

- [ ] **Step 6: AuthGuard のテストが通ることを確かめる**

Run: `npx jest src/core/modules/auth/auth.guard.spec.ts`
Expected: PASS（7 件）

- [ ] **Step 7: RBACGuard の失敗するテストを書く**

```ts
// src/core/modules/rbac/rbac.guard.spec.ts
import {
    ExecutionContext,
    ForbiddenException,
    UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RBACGuard } from './rbac.guard';
import { Role } from './role.enum';

const contextWith = (auth: unknown) =>
    ({
        getHandler: () => undefined,
        getClass: () => undefined,
        switchToHttp: () => ({ getRequest: () => ({ auth }) }),
    }) as unknown as ExecutionContext;

const guardRequiring = (roles: Role[] | undefined) => {
    const reflector = { getAllAndOverride: () => roles } as unknown as Reflector;
    return new RBACGuard(reflector);
};

describe('RBACGuard', () => {
    it('@RBAC が無ければ誰でも通す', () => {
        expect(guardRequiring(undefined).canActivate(contextWith(undefined))).toBe(true);
    });

    it('@RBAC があってトークンが無ければ 401', () => {
        expect(() =>
            guardRequiring([Role.EDITOR]).canActivate(contextWith(undefined)),
        ).toThrow(UnauthorizedException);
    });

    it('役割が足りなければ 403', () => {
        expect(() =>
            guardRequiring([Role.EDITOR, Role.MANAGER]).canActivate(
                contextWith({ userId: 'u', role: Role.REPORTER }),
            ),
        ).toThrow(ForbiddenException);
    });

    it('役割が無ければ 403', () => {
        expect(() =>
            guardRequiring([Role.EDITOR]).canActivate(
                contextWith({ userId: 'u', role: null }),
            ),
        ).toThrow(ForbiddenException);
    });

    it('役割が合えば通す', () => {
        expect(
            guardRequiring([Role.EDITOR, Role.MANAGER]).canActivate(
                contextWith({ userId: 'u', role: Role.MANAGER }),
            ),
        ).toBe(true);
    });
});
```

- [ ] **Step 8: 失敗を確かめる**

Run: `npx jest src/core/modules/rbac/rbac.guard.spec.ts`
Expected: FAIL（`cognito_jwt_payload` を見ているため）

- [ ] **Step 9: RBACGuard を書き換える**

```ts
// src/core/modules/rbac/rbac.guard.ts
import {
    ExecutionContext,
    ForbiddenException,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { RBAC_KEY } from './rbac.decorator';
import { Role } from './role.enum';

/** @RBAC の付いた口だけ役割を見る。トークンが無ければ 401、役割が足りなければ 403 */
@Injectable()
export class RBACGuard {
    constructor(private reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean {
        const requiredRoles = this.reflector.getAllAndOverride<Role[]>(
            RBAC_KEY,
            [context.getHandler(), context.getClass()],
        );

        if (!requiredRoles) {
            return true;
        }

        const auth = context.switchToHttp().getRequest<Request>().auth;

        if (!auth) {
            throw new UnauthorizedException();
        }

        if (!auth.role || !requiredRoles.includes(auth.role)) {
            throw new ForbiddenException();
        }

        return true;
    }
}
```

- [ ] **Step 10: 環境変数を足す**

`serverless.ts` の `provider.environment` の `COGNITO_CLIENT_ID` の次に:

```ts
            SUPABASE_URL: '${ssm:sotetsu-lab-v3-supabase-url}',
```

`taskdef.json` に `COGNITO_USERPOOL_ID` があるので、同じ形で `SUPABASE_URL`（値 `https://nofubcikiabamlnlxpko.supabase.co`）を足す。

- [ ] **Step 11: 全テストと build**

Run: `npx jest`
Run: `npm run build`
Expected: 全部 PASS・エラー無し（`cache-control.routes.spec.ts`・`operation.v3.controller.spec.ts` は Guard を差し替えているので影響しない）

- [ ] **Step 12: 手元で読み取りがトークン無しで通ることを確かめる**

手元の api を起動（`docker restart` で再ビルド。古いビルドに注意: `docker logs` で `error TS` が無いこと）。

Run: `curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/v3/agencies`
Expected: `200`
Run: `curl -s -o /dev/null -w '%{http_code}\n' -X PATCH http://localhost:3000/v3/operation-sightings/00000000-0000-0000-0000-000000000000/invalidate -H 'Content-Type: application/json' -d '{}'`
Expected: `401`（`@RBAC` の口はトークン必須）

- [ ] **Step 13: Commit**

```bash
git add package.json package-lock.json serverless.ts taskdef.json src/core
git commit -m "feat: :sparkles: 読み取りをトークン不要にし、Supabase の JWT で利用者と役割を見分ける"
```

---

### Task 4〜13: socket・client・backend（各リポジトリの計画に移した）

- Task 4（socket の authorizer）: socket リポジトリの `docs/superpowers/plans/2026-10-19-supabase-auth-migration.md`
- Task 5（client のトークンと socket）: client リポジトリの `docs/superpowers/plans/2026-10-19-supabase-auth-migration.md`
- Task 6〜13（backend のランタイム・セッション・トークン・ログイン・登録・プロフィール・移行スクリプト・撤去）: backend リポジトリの `docs/superpowers/plans/2026-10-19-supabase-auth-migration.md`

---

### Task 14: 手元で通しの確認（backend・api・client）

**Files:** なし

手元は本番の DB と本番の Supabase につながる。検証用の利用者を 1 人だけ作り、最後に消す。

- [ ] **Step 1: 起動**

backend（`npm run dev`）・api（docker）・client を起動。api は `docker logs` に `error TS` が無いこと。

- [ ] **Step 2: 登録 → ログイン → トークン → プロフィール**

```bash
curl -s -c "$TMPDIR/jar" -X POST http://localhost:4200/api/user/register -H 'Content-Type: application/json' -d '{"username":"VerifyUser01","password":"Passw0rd!x"}'
curl -s -c "$TMPDIR/jar" -b "$TMPDIR/jar" -X POST http://localhost:4200/api/auth/login -H 'Content-Type: application/json' -d '{"username":"verifyuser01","password":"Passw0rd!x"}'
curl -s -b "$TMPDIR/jar" http://localhost:4200/api/auth/token
curl -s -b "$TMPDIR/jar" http://localhost:4200/api/user/profile
```

backend へは client の開発サーバー（4200）の proxy 経由で入る（`environment.ts` の `backendUrl: '/api'`）。api は 3000。
Expected: 登録 201・ログイン 200（小文字で入れても通る）・トークン 200（`accessToken` を jwt.io 等に貼らず、`python3 -c` で payload の `user_role` が `reporter`・`iss` が `https://nofubcikiabamlnlxpko.supabase.co/auth/v1` であることを見る）・プロフィールの `username` が `VerifyUser01`

- [ ] **Step 3: API の RBAC**

取ったトークンで、`@RBAC(EDITOR, MANAGER)` の口に送る:

```bash
curl -s -o /dev/null -w '%{http_code}\n' -X PATCH http://localhost:3000/v3/operation-sightings/00000000-0000-0000-0000-000000000000/invalidate -H "x-sotetsu-lab-authorization: Bearer <accessToken>" -H 'Content-Type: application/json' -d '{}'
```

Expected: `403`（reporter なので）

- [ ] **Step 4: ログアウト → ゲスト**

```bash
curl -s -c "$TMPDIR/jar" -b "$TMPDIR/jar" -X POST http://localhost:4200/api/auth/logout
curl -s -o /dev/null -w '%{http_code}\n' -b "$TMPDIR/jar" http://localhost:4200/api/auth/token
```

Expected: ログアウト 200・トークン `204`

- [ ] **Step 5: 画面**

client でゲストのまま real-time とダッシュボードが出ること、ログイン → ヘッダーの表示名 → ログアウトができることを目で確かめる（Playwright でスクリーンショットを残す）。

- [ ] **Step 6: 後始末**

Supabase の管理画面か `admin.deleteUser` で検証用の利用者を消す（profiles は外部キーの cascade で消える）。Supabase MCP で確かめる:

```sql
select count(*) from auth.users where email = 'verifyuser01@users.sotetsu-lab.invalid';
```

Expected: `0`

---

### Task 15: ADR と spec の後片付け（api）

**Files:**
- Create: `docs/adr/0005-supabase-auth.md`

- [ ] **Step 1: ADR を書く**

```markdown
# ADR-0005: 認証基盤を Supabase Auth に移す

- 日付: 2026-10-19
- 状態: 採択
- spec: docs/superpowers/specs/2026-10-19-supabase-auth-migration-design.md

## 背景

ゲストにも登録者にも Cognito の役割ごとの共有トークンを配っており、API が利用者を見分けられなかった。目撃の投稿者を追跡するにはトークンが利用者を表す必要がある。

## 決定

- 利用者・セッションを Supabase Auth に寄せ、Cognito と backend の DynamoDB の利用者・セッションをやめる
- client は Supabase を知らない。backend がログイン・登録・更新・ログアウトを行い、トークンを HttpOnly Cookie（Path=/api）に入れる
- 利用者はメールアドレスを入れない。backend がユーザー名を `…@users.sotetsu-lab.invalid` に変える
- 読み取りはトークン不要。書き込みなど @RBAC の口だけ Supabase の JWT（ES256・JWKS）を検証し、`user_role`（Custom Access Token Hook が profiles から入れる）で判定する

## 却下した案

- backend が自前で署名した本人証明 JWT（鍵の管理が面倒）
- backend が fullaccess で代理投稿（権限が強すぎ、取りつくろい）
- セッション Cookie を api・socket が直接見る（API だけを外部公開する構想と合わない）
- Cognito の事前トークン生成で userId を埋め込む（Essentials と M2M の 1 件課金）
- Cognito のユーザープールへの移行（Cognito 自体をやめたい）

## 影響

- 全員 1 回ログインし直し
- パスワード再設定の画面は無い（管理者が手で設定）
- backend の Lambda を nodejs24.x・osls に上げた（supabase-js が Node 22 以上を求めるため。api と同じ構成）
- Supabase の JWT の検証は汎用の `jose`。切り替えの途中だけ Cognito 用に `aws-jwt-verify` を残し、Cognito の受け付けを外すときに依存ごと消す
```

- [ ] **Step 2: Commit**

```bash
git add docs/adr/0005-supabase-auth.md
git commit -m "docs: :memo: 認証基盤を Supabase Auth に移す ADR を書く"
```

---

## 切り替え手順（spec 9 章。各段はユーザーの承認を得て進める）

各リポジトリの PR を作り、ユーザーがマージする。デプロイと版上げはいつもの流れ（`npm version` はユーザーが `!` で流す）。

1. **Task 1・Task 2 の Step 6**（Supabase の設定・profiles・hook）
   確認: JWKS に ES256 の鍵がある・`profiles` がある・新しく発行したトークンのヘッダーが `alg=ES256` で、その `kid` が JWKS にある（Migrate しただけで rotate していないと HS256 のまま。その場合は rotate してから進む）
2. **api と socket をデプロイ**
   確認: socket の `.env.prod` に `SUPABASE_URL` がある（空でもデプロイはエラーにならず、Supabase のトークンだけが静かに拒否されるため、デプロイ前に値を見る）。`curl -s -o /dev/null -w '%{http_code}\n' https://api.sotetsu-lab.com/v3/agencies` → `200`（トークン無し）。本番の画面（まだ Cognito のトークン）が今までどおり動く
3. **client をデプロイ**
   確認: 本番の画面がログイン中もゲストも動く（backend はまだ Cognito。ゲストにも Cognito のトークンが返る）
   3 と 5 の間は、Service Worker の更新が利用者の端末に行き渡るまで空ける（古いタブが 401 を繰り返すため）
4. **移行スクリプトを本番で流す**（Task 12 の dry-run → 本番）
   確認: `created + skipped = users`・`failed=0`。Supabase MCP で `select count(*) from auth.users;` と `select role, count(*) from public.profiles group by role;` が DynamoDB の数と合う
5. **backend をデプロイ**（前提: Task 14 の手元での通しの確認を済ませていること。直前に 4 をもう一度流して、その間の登録を拾う）
   確認: `curl -s -o /dev/null -w '%{http_code}\n' https://v3.sotetsu-lab.com/api/token` → `403` か `404`（口が消えた）。ただし CloudFront が 403/404 を index.html に置き換える設定だと `200` になりうるので、本文が index.html でない（`curl -s https://v3.sotetsu-lab.com/api/token` の先頭が `<!doctype html>` でない）ことも見る。`curl -s -o /dev/null -w '%{http_code}\n' https://v3.sotetsu-lab.com/api/auth/token` → `204`。ユーザーに本番でログインしてもらい、表示名が出ること・ログイン中に socket へつながる（目撃の通知が届く）こと
6. **様子を見て Cognito の受け付けを外す**（別 PR。api・socket の Cognito の verifier・`aws-jwt-verify` の依存・`jwks.json`・`COGNITO_*` の環境変数を消す。目安は 5 から 1 日以上。Cognito の access token の寿命より十分長く）
7. **撤去**（ユーザーの確認を取ってから手で）
   - DynamoDB の管理テーブル・キャッシュテーブルの中身を列挙し、`users#`・`sessions`・`tokens#` 以外が無いことを確かめる
   - backend の `serverless.ts` から 2 つの表の定義を外してデプロイ（Retain なので表は残る）→ 表を手で消す
   - Cognito の app client とユーザープール、SSM の `sotetsu-lab-v3-idp-url`・`sotetsu-lab-v3-client-id`・`sotetsu-lab-v3-client-secret`・`sotetsu-lab-v3-auth-cognito-*` を消す
