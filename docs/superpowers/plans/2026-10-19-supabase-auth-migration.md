# 認証基盤を Supabase Auth に移す 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cognito と backend の自前ユーザー・セッションをやめ、利用者ごとの Supabase JWT で api・socket が人と役割を見分けられるようにする（読み取りはトークン不要）。

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

### Task 4: socket の authorizer をゲスト可・Supabase と Cognito の両方にする

**Files:**（socket リポジトリ）
- Modify: `package.json`（`jose` ^6.2.12 を足す。`aws-jwt-verify` は 4.0.1 のまま）
- Create: `src/functions/authorizer/token.ts`
- Modify: `src/functions/authorizer/handler.ts`
- Modify: `serverless.ts`（environment に `SUPABASE_URL`）
- Test: `src/functions/authorizer/handler.test.ts`・`src/functions/authorizer/token.test.ts`

**Interfaces:**
- Produces: authorizer の context `{ role: 'guest' }`（ゲスト）／`{ userId: string; role: string }`（Supabase）／`{ role: string }`（Cognito）。② の `sendSighting` 制限が使う

- [ ] **Step 1: jose を入れる**

Run: `npm install jose@^6.2.12`（allowed_domains: registry.npmjs.org）
Run: `npx tsc --noEmit`
Expected: エラー無し（socket は ESM なので jose をそのまま読める）

- [ ] **Step 2: token の判定の失敗するテストを書く**

```ts
// src/functions/authorizer/token.test.ts
import { describe, expect, it } from 'vitest';
import { isGuestToken, readUnverifiedIssuer } from './token.js';

describe('isGuestToken', () => {
    it.each(['guest', 'null', 'undefined', '', undefined])('%s はゲスト', (token) => {
        expect(isGuestToken(token)).toBe(true);
    });

    it('JWT はゲストではない', () => {
        expect(isGuestToken('a.b.c')).toBe(false);
    });
});

describe('readUnverifiedIssuer', () => {
    it('payload の iss を返す', () => {
        const payload = Buffer.from(JSON.stringify({ iss: 'https://x/auth/v1' })).toString('base64url');
        expect(readUnverifiedIssuer(`h.${payload}.s`)).toBe('https://x/auth/v1');
    });

    it('読めなければ null', () => {
        expect(readUnverifiedIssuer('garbage')).toBeNull();
    });
});
```

Run: `npx vitest run src/functions/authorizer/token.test.ts`
Expected: FAIL（`token.js` が無い）

- [ ] **Step 3: token.ts を書く**

```ts
// src/functions/authorizer/token.ts
/**
 * API Gateway の identitySource は値が無いと authorizer を呼ばずに 401 にするので、
 * client はゲストで token=guest を送る。SW に残った古い client は token=null を送る。
 */
const GUEST_TOKENS = new Set(['', 'guest', 'null', 'undefined']);

export const isGuestToken = (token: string | undefined): boolean =>
    GUEST_TOKENS.has(token ?? '');

/** どの発行元の verifier に回すかを決めるためだけに iss を読む。信用はしない */
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

Run: `npx vitest run src/functions/authorizer/token.test.ts`
Expected: PASS

- [ ] **Step 4: handler のテストを書き換える**

`handler.test.ts` の `vi.mock('aws-jwt-verify', …)` と `describe` を次に置き換える（`makeEvent`・`makeContext` はそのまま）:

```ts
process.env.SUPABASE_URL = 'https://example.supabase.co';
const SUPABASE_ISS = 'https://example.supabase.co/auth/v1';

const mockSupabaseVerify = vi.fn();
vi.mock('jose', () => ({
    createRemoteJWKSet: () => 'jwks',
    jwtVerify: (...args: unknown[]) => mockSupabaseVerify(...args),
}));
const mockCognitoVerify = vi.fn();
vi.mock('aws-jwt-verify', () => ({
    CognitoJwtVerifier: { create: () => ({ verify: mockCognitoVerify }) },
}));

const jwtWithIss = (iss: string) =>
    `h.${Buffer.from(JSON.stringify({ iss })).toString('base64url')}.s`;
```

```ts
describe('authorizer handler', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it.each(['guest', 'null'])('token=%s はゲストとして Allow', async (token) => {
        const { main } = await import('./handler.js');
        const event = makeEvent(token);
        await (main as (...args: unknown[]) => unknown)(event, makeContext(), vi.fn());
        expect(mockGenerateAuthorizerResult).toHaveBeenCalledWith('guest', 'Allow', event.methodArn, { role: 'guest' });
    });

    it('Supabase の JWT は sub と user_role を context に入れて Allow', async () => {
        const { main } = await import('./handler.js');
        mockSupabaseVerify.mockResolvedValueOnce({ payload: { sub: 'u-1', user_role: 'reporter' } });
        const event = makeEvent(jwtWithIss(SUPABASE_ISS));
        await (main as (...args: unknown[]) => unknown)(event, makeContext(), vi.fn());
        expect(mockGenerateAuthorizerResult).toHaveBeenCalledWith('u-1', 'Allow', event.methodArn, {
            userId: 'u-1',
            role: 'reporter',
        });
    });

    it('Cognito のトークンは scope の末尾を role にして Allow', async () => {
        const { main } = await import('./handler.js');
        mockCognitoVerify.mockResolvedValueOnce({ sub: 'client', scope: 'sotetsu-lab-v3-api/reporter' });
        const event = makeEvent(jwtWithIss('https://cognito-idp.example/pool'));
        await (main as (...args: unknown[]) => unknown)(event, makeContext(), vi.fn());
        expect(mockGenerateAuthorizerResult).toHaveBeenCalledWith('client', 'Allow', event.methodArn, {
            role: 'reporter',
        });
    });

    it('検証に失敗したら Deny', async () => {
        const { main } = await import('./handler.js');
        mockSupabaseVerify.mockRejectedValueOnce(new Error('expired'));
        const event = makeEvent(jwtWithIss(SUPABASE_ISS));
        await (main as (...args: unknown[]) => unknown)(event, makeContext(), vi.fn());
        expect(mockGenerateAuthorizerResult).toHaveBeenCalledWith('*', 'Deny', event.methodArn);
    });
});
```

Run: `npx vitest run src/functions/authorizer/handler.test.ts`
Expected: FAIL

- [ ] **Step 5: handler を書き換える**

```ts
// src/functions/authorizer/handler.ts
import { APIGatewayUtil } from '@utils/api-gateway';
import { middyfy } from '@utils/lambda';
import { logger } from '@utils/logger';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { APIGatewayAuthorizerResult, APIGatewayRequestAuthorizerEvent } from 'aws-lambda';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { isGuestToken, readUnverifiedIssuer } from './token.js';

type TEvent = APIGatewayRequestAuthorizerEvent;
type TResult = APIGatewayAuthorizerResult;

const supabaseIssuer = `${process.env.SUPABASE_URL}/auth/v1`;

const supabaseJwks = createRemoteJWKSet(new URL(`${supabaseIssuer}/.well-known/jwks.json`));

/** 切り替えの途中だけ受け付ける（api の spec 9 章の 2〜6）。6 で aws-jwt-verify ごと消す */
const cognitoVerifier = CognitoJwtVerifier.create({
    userPoolId: process.env.COGNITO_USERPOOL_ID ?? '',
    clientId: process.env.COGNITO_CLIENT_ID ?? '',
    tokenUse: 'access',
});

const COGNITO_SCOPE_PREFIX = 'sotetsu-lab-v3-api/';

/** 接続はゲストでも許す（受信のため）。トークンがあれば検証し、利用者と役割を接続の context に残す */
const authorizer = middyfy
    .asAPIGatewayAuthorizerHandler<TEvent, TResult>()
    .handler(async (event) => {
        const token = event.queryStringParameters?.token;

        if (isGuestToken(token)) {
            return APIGatewayUtil.generateAuthorizerResult('guest', 'Allow', event.methodArn, { role: 'guest' });
        }

        try {
            if (readUnverifiedIssuer(token!) === supabaseIssuer) {
                const { payload } = await jwtVerify(token!, supabaseJwks, {
                    issuer: supabaseIssuer,
                    audience: 'authenticated',
                });
                return APIGatewayUtil.generateAuthorizerResult(payload.sub!, 'Allow', event.methodArn, {
                    userId: payload.sub!,
                    role: String(payload.user_role ?? ''),
                });
            }

            const payload = await cognitoVerifier.verify(token!);
            return APIGatewayUtil.generateAuthorizerResult(payload.sub, 'Allow', event.methodArn, {
                role: String(payload.scope ?? '').replace(COGNITO_SCOPE_PREFIX, ''),
            });
        } catch (e) {
            logger.error(e);

            return APIGatewayUtil.generateAuthorizerResult(`*`, 'Deny', event.methodArn);
        }
    });

export const main = authorizer;
```

- [ ] **Step 6: テスト・型・lint**

Run: `npx vitest run`
Run: `npx tsc --noEmit`
Expected: 全部 PASS・エラー無し

- [ ] **Step 7: 環境変数を足す**

`serverless.ts` の environment の `COGNITO_CLIENT_ID` の次に:

```ts
            SUPABASE_URL: conf.get('SUPABASE_URL') ?? '',
```

`.env.example` に `SUPABASE_URL=` を足す。

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json serverless.ts .env.example src/functions/authorizer
git commit -m "feat: :sparkles: socket の接続をゲストにも開け、Supabase の JWT で利用者と役割を残す"
```

---

### Task 5: client がゲスト（204）を受け入れる

**Files:**（client リポジトリ）
- Modify: `src/app/libs/auth/usecase/dtos/token-details.dto.ts`
- Modify: `src/app/libs/auth/infrastructure/queries/token.query.ts`
- Modify: `src/app/libs/auth/usecase/auth.service.ts`
- Modify: `src/app/global-states/token.state.ts`
- Modify: `src/app/core/services/socket.service.ts`
- Test: `src/app/global-states/token.state.spec.ts`・`src/app/libs/auth/infrastructure/queries/token.query.spec.ts`

**Interfaces:**
- Consumes: backend `GET /api/auth/token` が 200 `TokenDetailsDto` か 204（本文無し）
- Produces: `TokenStateQuery.accessToken` はゲストで `null`。interceptor は既に `accessToken` が無ければヘッダーを付けない（変更不要）

- [ ] **Step 1: 失敗するテストを足す**

`token.state.spec.ts` の既存の書き方（AuthService のモック）に合わせて、次の 2 件を足す:

```ts
    it('トークン無し（204）なら状態を空にし、ヘッダーを付けない側に倒す', async () => {
        authService.getToken.mockReturnValueOnce(
            of({ accessToken: 'a', tokenType: 'Bearer', expiresAt: 9999999999 }),
        );
        await lastValueFrom(store.fetch());
        authService.getToken.mockReturnValueOnce(of(null));
        await lastValueFrom(store.fetch());
        expect(query.accessToken).toBeNull();
        expect(query.isExpired).toBe(false);
    });
```

`token.query.spec.ts` に（`HttpTestingController` の既存の書き方に合わせる）:

```ts
    it('204 なら null を返す', async () => {
        const result = lastValueFrom(query.getToken());
        httpMock
            .expectOne((req) => req.url.endsWith('/auth/token'))
            .flush(null, { status: 204, statusText: 'No Content' });
        await expect(result).resolves.toBeNull();
    });
```

既存の spec の変数名（`authService`・`store`・`query`・`httpMock`）が違う場合は、その spec の名前に合わせる。

Run: `npx jest --testPathPattern 'global-states/token.state|auth/infrastructure/queries/token.query'`
Expected: FAIL

- [ ] **Step 2: 型と取得を直す**

```ts
// src/app/libs/auth/usecase/dtos/token-details.dto.ts
export interface TokenDetailsDto {
    accessToken: string;

    tokenType: string;

    expiresAt: number;
}

/** ゲスト（未ログイン）は backend が 204 を返すので null */
export type TokenResult = TokenDetailsDto | null;
```

`token.query.ts` の `getToken` の戻り値を `Observable<TokenResult>` に、`this.#http.get<TokenDetailsDto>` を `this.#http.get<TokenResult>` に変える（204 は本文が null で届く）。`auth.service.ts` の `getToken` の戻り値も `Observable<TokenResult>` にする。

`token.state.ts` の `fetch` の `tap` を次にする:

```ts
            tap((v) => {
                state.update(
                    setProps(
                        v ?? { accessToken: null, tokenType: null, expiresAt: null },
                    ),
                );
            }),
```

- [ ] **Step 3: socket のゲストを `token=guest` にする**

`socket.service.ts` の `connect` の URL を次にする:

```ts
        // API Gateway は token が無いと 401 にするので、ゲストは guest を送る（socket の authorizer がゲストとして通す）
        this._conn = new WebSocket(
            `${this._url}?token=${this.#tokenStateQuery.accessToken ?? 'guest'}`,
        );
```

- [ ] **Step 4: テスト・型**

Run: `npx jest --testPathPattern 'global-states/token.state|auth/infrastructure/queries/token.query|core/interceptors/auth-interceptor|core/services/socket'`
Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: PASS・エラー無し

- [ ] **Step 5: Commit**

```bash
git add src/app/libs/auth src/app/global-states/token.state.ts src/app/global-states/token.state.spec.ts src/app/core/services/socket.service.ts
git commit -m "feat: :sparkles: ログインしていないときはトークン無しで API と socket につなぐ"
```

---

### Task 6: backend のランタイムを Node 24 に上げ、テスト基盤・supabase-js・ダミーのメールアドレスを入れる

**Files:**（backend リポジトリ）
- Modify: `package.json`（devDependencies の `serverless` を `osls` ^3.61.1 に、`@types/node` を ^24、`vitest` ^2.1.9 を足す。dependencies に `@supabase/supabase-js` ^2.118.0。engines の node を `>=24`。scripts `"test": "vitest run"`）
- Modify: `serverless.ts`（runtime `nodejs24.x`・esbuild の target `node24`・environment に Supabase の 3 つ）
- Modify: `Dockerfile`（`FROM node:24`）
- Create: `vitest.config.ts`
- Create: `src/utils/supabase.ts`
- Create: `src/libs/auth/usecase/auth-email.ts`
- Modify: `serverless.ts`（environment に Supabase の 3 つ）
- Test: `src/libs/auth/usecase/auth-email.test.ts`

**Interfaces:**
- Produces:
  - `AuthEmail.fromUsername(username: string): string`
  - `SupabaseUtil.userClient(): SupabaseClient`（publishable キー・リクエストごとに新しく作る）
  - `SupabaseUtil.adminClient(): SupabaseClient`（secret キー・使い回す）

- [ ] **Step 0: ランタイムを Node 24・osls に上げる（api と同じ）**

`serverless` 3.38 は nodejs20.x までしか知らないので、api と同じ `osls`（MIT・nodejs24.x を知っている）に替える。

Run: `npm uninstall serverless`
Run: `npm install -D osls@^3.61.1 @types/node@^24`（allowed_domains: registry.npmjs.org）
Run: `npx sls --version`
Expected: osls の版が出る（`sls` コマンドがそのまま使える。出なければ止めて報告）

- `serverless.ts`: `runtime: 'nodejs20.x'` → `'nodejs24.x'`、`custom.esbuild.target: 'node20'` → `'node24'`
- `package.json`: `"engines": { "node": ">=24" }`
- `Dockerfile`: `FROM node:20 as development` → `FROM node:24 as development`
- `docker-compose.yml` の `NODE_OPTIONS: --no-experimental-require-module`（serverless-offline の require(esm) 対策）は残す

Run: `npx tsc --noEmit`
Run: `npm run presls`
Expected: エラー無し・`serverless.yaml` の runtime が `nodejs24.x`

手元の開発コンテナは別ボリュームなので作り直して `npm ci` する（`docker compose build` → `docker compose up -d`）。`docker logs` に起動のエラーが無く、`curl -s http://localhost:4200/api/maintenance`（`get-maintenance` の口）が今までどおり返ること。起動でクラッシュしたら、原因のプラグイン（serverless-offline・serverless-esbuild など）を Node 24 で動く版に上げる（Node 20.19 で起きた require(esm) の問題と同じ系統の可能性）。上げても直らなければ止めて報告する。

```bash
git add package.json package-lock.json serverless.ts serverless.yaml Dockerfile
git commit -m "build: :arrow_up: backend の Lambda を Node 24 に上げ、Serverless Framework を osls に替える"
```

- [ ] **Step 1: 依存を入れる**

Run: `npm install @supabase/supabase-js@^2.118.0`
Run: `npm install -D vitest@^2.1.9`
（allowed_domains: registry.npmjs.org。`preinstall` の typesync が型を足したら一緒にコミットする）

`package.json` の `"test"` を `"vitest run"` にする。

```ts
// vitest.config.ts
import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
    },
    resolve: {
        alias: {
            '@configs': path.resolve(__dirname, 'src/configs'),
            '@functions': path.resolve(__dirname, 'src/functions'),
            '@libs': path.resolve(__dirname, 'src/libs'),
            '@utils': path.resolve(__dirname, 'src/utils'),
        },
    },
});
```

- [ ] **Step 2: AuthEmail の失敗するテストを書く**

```ts
// src/libs/auth/usecase/auth-email.test.ts
import { describe, expect, it } from 'vitest';
import { AuthEmail } from './auth-email';

describe('AuthEmail.fromUsername', () => {
    it('小文字にして内部用のドメインを付ける', () => {
        expect(AuthEmail.fromUsername('Sotetsu_12000')).toBe('sotetsu_12000@users.sotetsu-lab.invalid');
    });

    it('記号 - と _ はそのまま', () => {
        expect(AuthEmail.fromUsername('a-b_c')).toBe('a-b_c@users.sotetsu-lab.invalid');
    });
});
```

Run: `npx vitest run src/libs/auth/usecase/auth-email.test.ts`
Expected: FAIL

- [ ] **Step 3: AuthEmail と SupabaseUtil を書く**

```ts
// src/libs/auth/usecase/auth-email.ts
/**
 * 利用者はメールアドレスを入れない。Supabase Auth はメールアドレスかの電話番号でしかログインできないので、
 * ユーザー名を届かないドメイン（RFC 2606 の .invalid）のアドレスに変えて渡す。変換はここ 1 か所だけ。
 * 小文字にするので、ログインは大文字と小文字を区別しない。
 */
const DOMAIN = 'users.sotetsu-lab.invalid';

const fromUsername = (username: string): string => `${username.toLowerCase()}@${DOMAIN}`;

export const AuthEmail = {
    fromUsername,
} as const;
```

```ts
// src/utils/supabase.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SERVER_AUTH_OPTIONS = {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
} as const;

let admin: SupabaseClient | undefined;

/** ログイン・更新など利用者のセッションを扱う。セッションを抱えるのでリクエストごとに作る */
const userClient = (): SupabaseClient =>
    createClient(process.env.SUPABASE_URL ?? '', process.env.SUPABASE_PUBLISHABLE_KEY ?? '', SERVER_AUTH_OPTIONS);

/** 管理 API と profiles の読み書き。RLS を通らない secret キーなので backend の外に出さない */
const adminClient = (): SupabaseClient => {
    admin ??= createClient(process.env.SUPABASE_URL ?? '', process.env.SUPABASE_SECRET_KEY ?? '', SERVER_AUTH_OPTIONS);
    return admin;
};

export const SupabaseUtil = {
    userClient,
    adminClient,
} as const;
```

`serverless.ts` の `provider.environment` の `CLIENT_SECRET` の次に:

```ts
            SUPABASE_URL: '${ssm:sotetsu-lab-v3-supabase-url}',
            SUPABASE_PUBLISHABLE_KEY: '${ssm:sotetsu-lab-v3-supabase-publishable-key}',
            SUPABASE_SECRET_KEY: '${ssm:sotetsu-lab-v3-supabase-secret-key}',
```

- [ ] **Step 4: テスト・型**

Run: `npx vitest run`
Run: `npx tsc --noEmit`
Expected: PASS・エラー無し

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.ts serverless.ts src/utils/supabase.ts src/libs/auth/usecase/auth-email.ts src/libs/auth/usecase/auth-email.test.ts
git commit -m "build: :heavy_plus_sign: backend に vitest と supabase-js を入れ、ユーザー名を内部用のメールアドレスに変える"
```

---

### Task 7: セッションを Cookie から解く（更新を含む）

**Files:**
- Create: `src/libs/auth/usecase/dtos/auth-session.dto.ts`
- Create: `src/libs/auth/usecase/resolve-session.usecase.ts`
- Create: `src/utils/auth-cookie.ts`
- Test: `src/libs/auth/usecase/resolve-session.usecase.test.ts`・`src/utils/auth-cookie.test.ts`

**Interfaces:**
- Consumes: `SupabaseUtil.userClient()`
- Produces:
  - `type AuthSessionDto = { accessToken: string; refreshToken: string; expiresAt: number }`
  - `type ResolvedSession = { kind: 'active'; session: AuthSessionDto; refreshed: boolean } | { kind: 'guest' }`
  - `ResolveSessionUseCase.execute(cookies: { accessToken?: string; refreshToken?: string }, now?: number): Promise<ResolvedSession>`（Supabase に届かなければ 503 を投げる）
  - `AuthCookie.read(event): { accessToken?: string; refreshToken?: string }`
  - `AuthCookie.issue(session: AuthSessionDto): string[]`（`sb-access`・`sb-refresh`・`loggedIn`・旧 `sessionId` の削除）
  - `AuthCookie.clear(): string[]`

- [ ] **Step 1: 失敗するテストを書く**

```ts
// src/libs/auth/usecase/resolve-session.usecase.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

const refreshSession = vi.fn();
vi.mock('@utils/supabase', () => ({
    SupabaseUtil: { userClient: () => ({ auth: { refreshSession } }) },
}));

const { ResolveSessionUseCase } = await import('./resolve-session.usecase');

const NOW = 1_800_000_000;
const jwtExpiringAt = (exp: number) => `h.${Buffer.from(JSON.stringify({ exp })).toString('base64url')}.s`;

describe('ResolveSessionUseCase', () => {
    beforeEach(() => vi.clearAllMocks());

    it('Cookie が無ければゲスト', async () => {
        await expect(ResolveSessionUseCase.execute({}, NOW)).resolves.toEqual({ kind: 'guest' });
    });

    it('access token が 60 秒より先まで有効なら更新しない', async () => {
        const accessToken = jwtExpiringAt(NOW + 61);
        await expect(ResolveSessionUseCase.execute({ accessToken, refreshToken: 'r' }, NOW)).resolves.toEqual({
            kind: 'active',
            session: { accessToken, refreshToken: 'r', expiresAt: NOW + 61 },
            refreshed: false,
        });
        expect(refreshSession).not.toHaveBeenCalled();
    });

    it('切れかけなら refresh token で更新する', async () => {
        refreshSession.mockResolvedValueOnce({
            data: { session: { access_token: 'new-a', refresh_token: 'new-r', expires_at: NOW + 3600 } },
            error: null,
        });
        await expect(
            ResolveSessionUseCase.execute({ accessToken: jwtExpiringAt(NOW + 30), refreshToken: 'r' }, NOW),
        ).resolves.toEqual({
            kind: 'active',
            session: { accessToken: 'new-a', refreshToken: 'new-r', expiresAt: NOW + 3600 },
            refreshed: true,
        });
        expect(refreshSession).toHaveBeenCalledWith({ refresh_token: 'r' });
    });

    it('access token が無く refresh token だけでも更新する', async () => {
        refreshSession.mockResolvedValueOnce({
            data: { session: { access_token: 'a', refresh_token: 'r2', expires_at: NOW + 3600 } },
            error: null,
        });
        const result = await ResolveSessionUseCase.execute({ refreshToken: 'r' }, NOW);
        expect(result.kind).toBe('active');
    });

    it('期限切れの access token だけで refresh token が無ければゲスト', async () => {
        await expect(
            ResolveSessionUseCase.execute({ accessToken: jwtExpiringAt(NOW - 10) }, NOW),
        ).resolves.toEqual({ kind: 'guest' });
    });

    it('更新を断られたら（失効・ban）ゲスト', async () => {
        refreshSession.mockResolvedValueOnce({
            data: { session: null },
            error: { status: 400, name: 'AuthApiError', message: 'Invalid Refresh Token' },
        });
        await expect(ResolveSessionUseCase.execute({ refreshToken: 'r' }, NOW)).resolves.toEqual({ kind: 'guest' });
    });

    it('Supabase に届かなければ 503 を投げる（ゲストにしない）', async () => {
        refreshSession.mockResolvedValueOnce({
            data: { session: null },
            error: { status: 0, name: 'AuthRetryableFetchError', message: 'fetch failed' },
        });
        await expect(ResolveSessionUseCase.execute({ refreshToken: 'r' }, NOW)).rejects.toMatchObject({
            statusCode: 503,
        });
    });

    it('壊れた access token は期限切れとして扱う', async () => {
        await expect(ResolveSessionUseCase.execute({ accessToken: 'garbage' }, NOW)).resolves.toEqual({
            kind: 'guest',
        });
    });
});
```

```ts
// src/utils/auth-cookie.test.ts
import { describe, expect, it } from 'vitest';
import { AuthCookie } from './auth-cookie';

describe('AuthCookie', () => {
    it('issue は sb-access・sb-refresh を HttpOnly で Path=/api に、loggedIn を JS から読める形で出し、旧 sessionId を消す', () => {
        const cookies = AuthCookie.issue({ accessToken: 'a', refreshToken: 'r', expiresAt: 1_800_000_000 });
        expect(cookies.find((c) => c.startsWith('sb-access=a'))).toMatch(/HttpOnly/);
        expect(cookies.find((c) => c.startsWith('sb-access=a'))).toMatch(/Path=\/api/);
        expect(cookies.find((c) => c.startsWith('sb-refresh=r'))).toMatch(/HttpOnly/);
        expect(cookies.find((c) => c.startsWith('loggedIn=true'))).not.toMatch(/HttpOnly/);
        expect(cookies.find((c) => c.startsWith('sessionId='))).toMatch(/Expires=Thu, 01 Jan 1970/);
    });

    it('clear は 4 つとも期限切れにする', () => {
        const cookies = AuthCookie.clear();
        expect(cookies).toHaveLength(4);
        cookies.forEach((c) => expect(c).toMatch(/Expires=Thu, 01 Jan 1970/));
    });

    it('read は Cookie ヘッダーから 2 つを読む', () => {
        const event = { headers: { cookie: 'sb-access=a; sb-refresh=r; loggedIn=true' } };
        expect(AuthCookie.read(event as never)).toEqual({ accessToken: 'a', refreshToken: 'r' });
    });
});
```

Run: `npx vitest run src/libs/auth/usecase/resolve-session.usecase.test.ts src/utils/auth-cookie.test.ts`
Expected: FAIL

- [ ] **Step 2: 実装する**

```ts
// src/libs/auth/usecase/dtos/auth-session.dto.ts
export type AuthSessionDto = {
    accessToken: string;
    refreshToken: string;
    /** access token の期限（UNIX 秒） */
    expiresAt: number;
};
```

```ts
// src/libs/auth/usecase/resolve-session.usecase.ts
import { SupabaseUtil } from '@utils/supabase';
import createHttpError from 'http-errors';
import { StatusCodes } from 'http-status-codes';
import { AuthSessionDto } from './dtos/auth-session.dto';

export type ResolvedSession = { kind: 'active'; session: AuthSessionDto; refreshed: boolean } | { kind: 'guest' };

/** 期限のこれだけ前から更新する */
const REFRESH_MARGIN_SECONDS = 60;

/** Cookie は backend しか書かないので署名は見ない（API が検証する）。期限だけ読む */
const readExp = (jwt: string): number | null => {
    try {
        const exp = JSON.parse(Buffer.from(jwt.split('.')[1] ?? '', 'base64url').toString('utf-8')).exp;
        return typeof exp === 'number' ? exp : null;
    } catch {
        return null;
    }
};

/**
 * Cookie の access token が使えればそのまま、切れかけなら refresh token で更新する。
 * 更新を断られたら（失効・ban）ゲスト。Supabase に届かないときはゲストにせず 503（ログアウトさせない）。
 * 同じ refresh token の同時更新は Supabase の 10 秒の猶予が吸収する。
 */
const execute = async (
    cookies: { accessToken?: string; refreshToken?: string },
    now: number = Math.floor(Date.now() / 1000),
): Promise<ResolvedSession> => {
    const { accessToken, refreshToken } = cookies;
    const exp = accessToken ? readExp(accessToken) : null;

    if (accessToken && refreshToken && exp !== null && exp - REFRESH_MARGIN_SECONDS > now) {
        return { kind: 'active', session: { accessToken, refreshToken, expiresAt: exp }, refreshed: false };
    }

    if (!refreshToken) {
        return { kind: 'guest' };
    }

    const { data, error } = await SupabaseUtil.userClient().auth.refreshSession({ refresh_token: refreshToken });

    if (error && (error.status === 0 || (error.status ?? 0) >= 500)) {
        throw createHttpError(StatusCodes.SERVICE_UNAVAILABLE, 'Authentication service unavailable.');
    }

    if (error || !data.session) {
        return { kind: 'guest' };
    }

    return {
        kind: 'active',
        session: {
            accessToken: data.session.access_token,
            refreshToken: data.session.refresh_token,
            expiresAt: data.session.expires_at ?? (readExp(data.session.access_token) as number),
        },
        refreshed: true,
    };
};

export const ResolveSessionUseCase = {
    execute,
} as const;
```

注: 「access token が 60 秒より先まで有効」で refresh token も無い Cookie は存在しない（issue は必ず両方出す）ので、両方そろっているときだけ更新を省く。

```ts
// src/utils/auth-cookie.ts
import { CookieConfig } from '@configs/cookie';
import { AuthSessionDto } from '@libs/auth/usecase/dtos/auth-session.dto';
import { APIGWUtil } from '@utils/api-gateway';
import type { APIGatewayProxyEvent } from 'aws-lambda';
import { serialize } from 'cookie';

const ACCESS = 'sb-access';
const REFRESH = 'sb-refresh';
const LOGGED_IN = 'loggedIn';
/** Cognito 時代のセッション Cookie。消すだけ */
const LEGACY_SESSION = 'sessionId';

/** backend の口は /api/auth/* と /api/user/profile。API（別ドメイン）には Cookie を送らない */
const TOKEN_COOKIE = { ...CookieConfig, path: '/api' } as const;
/** refresh token の寿命は Supabase 側が決める。Cookie はそれより長く持たせて、失効は Supabase に判定させる */
const REFRESH_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const EXPIRED = new Date(0);

const issue = (session: AuthSessionDto): string[] => [
    serialize(ACCESS, session.accessToken, { ...TOKEN_COOKIE, expires: new Date(session.expiresAt * 1000) }),
    serialize(REFRESH, session.refreshToken, { ...TOKEN_COOKIE, maxAge: REFRESH_MAX_AGE_SECONDS }),
    serialize(LOGGED_IN, 'true', { ...CookieConfig, httpOnly: false, maxAge: REFRESH_MAX_AGE_SECONDS }),
    serialize(LEGACY_SESSION, '', { ...CookieConfig, expires: EXPIRED }),
];

const clear = (): string[] => [
    serialize(ACCESS, '', { ...TOKEN_COOKIE, expires: EXPIRED }),
    serialize(REFRESH, '', { ...TOKEN_COOKIE, expires: EXPIRED }),
    serialize(LOGGED_IN, '', { ...CookieConfig, httpOnly: false, expires: EXPIRED }),
    serialize(LEGACY_SESSION, '', { ...CookieConfig, expires: EXPIRED }),
];

const read = (event: APIGatewayProxyEvent): { accessToken?: string; refreshToken?: string } => {
    const cookies = APIGWUtil.getCookies(event);
    return { accessToken: cookies[ACCESS] || undefined, refreshToken: cookies[REFRESH] || undefined };
};

export const AuthCookie = {
    issue,
    clear,
    read,
} as const;
```

- [ ] **Step 3: テスト・型**

Run: `npx vitest run`
Run: `npx tsc --noEmit`
Expected: PASS・エラー無し

- [ ] **Step 4: Commit**

```bash
git add src/libs/auth/usecase/dtos/auth-session.dto.ts src/libs/auth/usecase/resolve-session.usecase.ts src/libs/auth/usecase/resolve-session.usecase.test.ts src/utils/auth-cookie.ts src/utils/auth-cookie.test.ts
git commit -m "feat: :sparkles: Supabase のトークンを Cookie から読み、切れかけなら更新する"
```

---

### Task 8: `/api/auth/token` を Supabase のトークンとゲストの 204 にする

**Files:**
- Modify: `src/functions/get-auth-token/handler.ts`
- Delete: `src/libs/auth/usecase/get-auth-token.usecase.ts`
- Modify: `src/utils/api-gateway.ts`（本文無しの応答）
- Test: `src/functions/get-auth-token/handler.test.ts`

**Interfaces:**
- Consumes: `ResolveSessionUseCase.execute`・`AuthCookie.read/issue/clear`
- Produces: `APIGWUtil.formatEmptyResponse(res: { statusCode: StatusCodes; headers?: Record<string, string>; multiValueHeaders?: Record<string, string[]> })`

- [ ] **Step 1: 失敗するテストを書く**

```ts
// src/functions/get-auth-token/handler.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

const resolve = vi.fn();
vi.mock('@libs/auth/usecase/resolve-session.usecase', () => ({
    ResolveSessionUseCase: { execute: resolve },
}));

const { main } = await import('./handler');

const call = (cookie?: string) =>
    (main as unknown as (e: unknown, c: unknown) => Promise<{ statusCode: number; body?: string; headers?: Record<string, string>; multiValueHeaders?: Record<string, string[]> }>)(
        { headers: cookie ? { cookie } : {}, httpMethod: 'GET' },
        {},
    );

describe('get-auth-token', () => {
    beforeEach(() => vi.clearAllMocks());

    it('ゲストは 204・Cookie を消す・no-store', async () => {
        resolve.mockResolvedValueOnce({ kind: 'guest' });
        const res = await call();
        expect(res.statusCode).toBe(204);
        expect(res.headers?.['Cache-Control']).toBe('no-store');
        expect(res.multiValueHeaders?.['Set-Cookie']).toHaveLength(4);
    });

    it('更新しなかったら Cookie を書かずにトークンを返す', async () => {
        resolve.mockResolvedValueOnce({
            kind: 'active',
            session: { accessToken: 'a', refreshToken: 'r', expiresAt: 100 },
            refreshed: false,
        });
        const res = await call('sb-access=a; sb-refresh=r');
        expect(res.statusCode).toBe(200);
        expect(JSON.parse(res.body!)).toEqual({ accessToken: 'a', tokenType: 'Bearer', expiresAt: 100 });
        expect(res.multiValueHeaders?.['Set-Cookie']).toBeUndefined();
    });

    it('更新したら新しい Cookie を書く', async () => {
        resolve.mockResolvedValueOnce({
            kind: 'active',
            session: { accessToken: 'a2', refreshToken: 'r2', expiresAt: 200 },
            refreshed: true,
        });
        const res = await call('sb-refresh=r');
        expect(res.statusCode).toBe(200);
        expect(res.multiValueHeaders?.['Set-Cookie']?.some((c) => c.startsWith('sb-refresh=r2'))).toBe(true);
    });
});
```

Run: `npx vitest run src/functions/get-auth-token/handler.test.ts`
Expected: FAIL

- [ ] **Step 2: 実装する**

`src/utils/api-gateway.ts` の `formatJSONResponseV2` の次に足し、`APIGWUtil` に `formatEmptyResponse` を加える:

```ts
const formatEmptyResponse = (res: {
    statusCode: StatusCodes;
    headers?: Record<string, string>;
    multiValueHeaders?: Record<string, string[]>;
}) => {
    return { ...res, body: '' };
};
```

```ts
// src/functions/get-auth-token/handler.ts
import { ResolveSessionUseCase } from '@libs/auth/usecase/resolve-session.usecase';
import { APIGWUtil } from '@utils/api-gateway';
import { AuthCookie } from '@utils/auth-cookie';
import { middyfy } from '@utils/lambda';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { StatusCodes } from 'http-status-codes';

type TEvent = APIGatewayProxyEvent;
type TResult = APIGatewayProxyResult;

// トークンは寿命が短いので、ブラウザや中継に残させない（期限切れのトークンが使い回されて API が 401 になる）
const NO_STORE = { 'Cache-Control': 'no-store' };

/** ログイン中は Supabase の access token、ゲストは 204（client はトークン無しで API を読む） */
const getAuthToken = middyfy.asAPIGWHandler<TEvent, TResult>().handler(async (event) => {
    const resolved = await ResolveSessionUseCase.execute(AuthCookie.read(event));

    if (resolved.kind === 'guest') {
        return APIGWUtil.formatEmptyResponse({
            statusCode: StatusCodes.NO_CONTENT,
            headers: NO_STORE,
            multiValueHeaders: { 'Set-Cookie': AuthCookie.clear() },
        });
    }

    const { session, refreshed } = resolved;

    return APIGWUtil.formatJSONResponseV2({
        headers: NO_STORE,
        ...(refreshed ? { multiValueHeaders: { 'Set-Cookie': AuthCookie.issue(session) } } : {}),
        body: { accessToken: session.accessToken, tokenType: 'Bearer', expiresAt: session.expiresAt },
    });
});

export const main = getAuthToken;
```

Run: `git rm src/libs/auth/usecase/get-auth-token.usecase.ts`

- [ ] **Step 3: テスト・型**

Run: `npx vitest run`
Run: `npx tsc --noEmit`
Expected: PASS・エラー無し（middy のミドルウェアがテストで問題になる場合は、`middyfy` の中身を読んで handler 単体を呼べる形に合わせる。テストの期待値は変えない）

- [ ] **Step 4: Commit**

```bash
git add -A src/functions/get-auth-token src/libs/auth/usecase src/utils/api-gateway.ts
git commit -m "feat: :sparkles: トークンの口を Supabase の access token に替え、ゲストには 204 を返す"
```

---

### Task 9: ログインとログアウトを Supabase に替える

**Files:**
- Modify: `src/libs/auth/usecase/login.usecase.ts`・`src/functions/login/handler.ts`
- Modify: `src/libs/auth/usecase/logout.usecase.ts`・`src/libs/auth/usecase/dtos/logout.dto.ts`・`src/functions/logout/handler.ts`
- Delete: `src/libs/auth/usecase/dtos/session-details.dto.ts`
- Test: `src/libs/auth/usecase/login.usecase.test.ts`・`src/libs/auth/usecase/logout.usecase.test.ts`

**Interfaces:**
- Consumes: `AuthEmail.fromUsername`・`SupabaseUtil`・`ResolveSessionUseCase`・`AuthCookie`
- Produces: `LoginUseCase.execute(dto: LoginDto): Promise<AuthSessionDto>`・`LogoutUseCase.execute(cookies: { accessToken?: string; refreshToken?: string }): Promise<void>`

- [ ] **Step 1: 失敗するテストを書く**

```ts
// src/libs/auth/usecase/login.usecase.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

const signInWithPassword = vi.fn();
vi.mock('@utils/supabase', () => ({
    SupabaseUtil: { userClient: () => ({ auth: { signInWithPassword } }) },
}));

const { LoginUseCase } = await import('./login.usecase');

describe('LoginUseCase', () => {
    beforeEach(() => vi.clearAllMocks());

    it('ユーザー名を小文字のダミーのメールアドレスにしてログインし、セッションを返す', async () => {
        signInWithPassword.mockResolvedValueOnce({
            data: { session: { access_token: 'a', refresh_token: 'r', expires_at: 100 } },
            error: null,
        });
        await expect(LoginUseCase.execute({ username: 'Sotetsu', password: 'Passw0rd!' })).resolves.toEqual({
            accessToken: 'a',
            refreshToken: 'r',
            expiresAt: 100,
        });
        expect(signInWithPassword).toHaveBeenCalledWith({
            email: 'sotetsu@users.sotetsu-lab.invalid',
            password: 'Passw0rd!',
        });
    });

    it('資格が違えば 401（利用者がいるかは言わない）', async () => {
        signInWithPassword.mockResolvedValueOnce({
            data: { session: null },
            error: { status: 400, name: 'AuthApiError', message: 'Invalid login credentials' },
        });
        await expect(LoginUseCase.execute({ username: 'x', password: 'y' })).rejects.toMatchObject({
            statusCode: 401,
            message: 'Unauthorized.',
        });
    });

    it('Supabase に届かなければ 503', async () => {
        signInWithPassword.mockResolvedValueOnce({
            data: { session: null },
            error: { status: 0, name: 'AuthRetryableFetchError', message: 'fetch failed' },
        });
        await expect(LoginUseCase.execute({ username: 'x', password: 'y' })).rejects.toMatchObject({
            statusCode: 503,
        });
    });
});
```

```ts
// src/libs/auth/usecase/logout.usecase.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

const resolve = vi.fn();
vi.mock('./resolve-session.usecase', () => ({ ResolveSessionUseCase: { execute: resolve } }));
const signOut = vi.fn();
vi.mock('@utils/supabase', () => ({
    SupabaseUtil: { adminClient: () => ({ auth: { admin: { signOut } } }) },
}));

const { LogoutUseCase } = await import('./logout.usecase');

describe('LogoutUseCase', () => {
    beforeEach(() => vi.clearAllMocks());

    it('使える access token でこのセッションだけ失効させる', async () => {
        resolve.mockResolvedValueOnce({
            kind: 'active',
            session: { accessToken: 'a', refreshToken: 'r', expiresAt: 1 },
            refreshed: false,
        });
        signOut.mockResolvedValueOnce({ data: null, error: null });
        await LogoutUseCase.execute({ accessToken: 'a', refreshToken: 'r' });
        expect(signOut).toHaveBeenCalledWith('a', 'local');
    });

    it('ゲストなら何もしない', async () => {
        resolve.mockResolvedValueOnce({ kind: 'guest' });
        await LogoutUseCase.execute({});
        expect(signOut).not.toHaveBeenCalled();
    });

    it('失効に失敗しても投げない（Cookie は handler が必ず消す）', async () => {
        resolve.mockRejectedValueOnce(new Error('503'));
        await expect(LogoutUseCase.execute({ refreshToken: 'r' })).resolves.toBeUndefined();
    });
});
```

Run: `npx vitest run src/libs/auth/usecase/login.usecase.test.ts src/libs/auth/usecase/logout.usecase.test.ts`
Expected: FAIL

- [ ] **Step 2: 実装する**

```ts
// src/libs/auth/usecase/login.usecase.ts
import { SupabaseUtil } from '@utils/supabase';
import createHttpError from 'http-errors';
import { StatusCodes } from 'http-status-codes';
import { AuthEmail } from './auth-email';
import { AuthSessionDto } from './dtos/auth-session.dto';
import { LoginDto } from './dtos/login.dto';

const execute = async (dto: LoginDto): Promise<AuthSessionDto> => {
    const { username, password } = dto;

    const { data, error } = await SupabaseUtil.userClient().auth.signInWithPassword({
        email: AuthEmail.fromUsername(username),
        password,
    });

    if (error && (error.status === 0 || (error.status ?? 0) >= 500)) {
        throw createHttpError(StatusCodes.SERVICE_UNAVAILABLE, 'Authentication service unavailable.');
    }

    if (error || !data.session) {
        throw createHttpError(StatusCodes.UNAUTHORIZED, 'Unauthorized.');
    }

    return {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: data.session.expires_at as number,
    };
};

export const LoginUseCase = {
    execute,
} as const;
```

```ts
// src/libs/auth/usecase/dtos/logout.dto.ts
export type LogoutDto = {
    accessToken?: string;
    refreshToken?: string;
};
```

```ts
// src/libs/auth/usecase/logout.usecase.ts
import { logger } from '@utils/logger';
import { SupabaseUtil } from '@utils/supabase';
import { LogoutDto } from './dtos/logout.dto';
import { ResolveSessionUseCase } from './resolve-session.usecase';

/** このセッションだけ Supabase で失効させる。失敗しても投げない（Cookie は handler が必ず消す） */
const execute = async (dto: LogoutDto): Promise<void> => {
    try {
        const resolved = await ResolveSessionUseCase.execute(dto);
        if (resolved.kind === 'guest') return;
        await SupabaseUtil.adminClient().auth.admin.signOut(resolved.session.accessToken, 'local');
    } catch (e) {
        logger.warn(e, 'Failed to revoke the Supabase session on logout.');
    }
};

export const LogoutUseCase = {
    execute,
} as const;
```

`logger` が `src/utils/logger.ts` に無い名前なら、その実体（pino）の書き出しの名前に合わせる。

`src/functions/login/handler.ts` の `handler` の中を次にする（import は `AuthCookie` を足し、`CookieConfig`・`serialize` を外す）:

```ts
    .handler(async (event) => {
        const { username, password } = event.body;

        const session = await LoginUseCase.execute({ username, password });

        return APIGWUtil.formatJSONResponseV2({
            multiValueHeaders: { 'Set-Cookie': AuthCookie.issue(session) },
            body: { message: 'Login successful.' },
        });
    });
```

`src/functions/logout/handler.ts` の `handler` を次にする（セッションが無くても 200 で Cookie を消す。import は `AuthCookie` を足し、`CookieConfig`・`serialize`・`createHttpError`・`StatusCodes` を外す）:

```ts
const logout = middyfy.asAPIGWHandler<TEvent, TResult>().handler(async (event) => {
    await LogoutUseCase.execute(AuthCookie.read(event));

    return APIGWUtil.formatJSONResponseV2({
        multiValueHeaders: { 'Set-Cookie': AuthCookie.clear() },
        body: { message: 'Logout successful.' },
    });
});
```

Run: `git rm src/libs/auth/usecase/dtos/session-details.dto.ts`

- [ ] **Step 3: テスト・型**

Run: `npx vitest run`
Run: `npx tsc --noEmit`
Expected: PASS・エラー無し

- [ ] **Step 4: Commit**

```bash
git add -A src/functions/login src/functions/logout src/libs/auth/usecase
git commit -m "feat: :sparkles: ログインとログアウトを Supabase Auth で行い、トークンを Cookie に入れる"
```

---

### Task 10: 登録を Supabase の管理 API と profiles にする

**Files:**
- Create: `src/libs/user/infrastructure/commands/profile.command.ts`
- Modify: `src/libs/user/usecase/register-user.usecase.ts`
- Test: `src/libs/user/usecase/register-user.usecase.test.ts`

**Interfaces:**
- Consumes: `AuthEmail.fromUsername`・`SupabaseUtil.adminClient`・表 `profiles`（Task 2）
- Produces: `ProfileCommand.insert(profile: { userId: string; username: string; displayName: string; role: string; createdAt?: string }): Promise<{ duplicate: boolean }>`（Task 13 も使う）

- [ ] **Step 1: 失敗するテストを書く**

```ts
// src/libs/user/usecase/register-user.usecase.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

const createUser = vi.fn();
const deleteUser = vi.fn();
vi.mock('@utils/supabase', () => ({
    SupabaseUtil: { adminClient: () => ({ auth: { admin: { createUser, deleteUser } } }) },
}));
const insert = vi.fn();
vi.mock('../infrastructure/commands/profile.command', () => ({ ProfileCommand: { insert } }));

const { RegisterUserUseCase } = await import('./register-user.usecase');

describe('RegisterUserUseCase', () => {
    beforeEach(() => vi.clearAllMocks());

    it('確認済みの利用者を作り、profiles に reporter で入れる', async () => {
        createUser.mockResolvedValueOnce({ data: { user: { id: 'u-1' } }, error: null });
        insert.mockResolvedValueOnce({ duplicate: false });
        await RegisterUserUseCase.execute({ username: 'Sotetsu', password: 'Passw0rd!' });
        expect(createUser).toHaveBeenCalledWith({
            email: 'sotetsu@users.sotetsu-lab.invalid',
            password: 'Passw0rd!',
            email_confirm: true,
        });
        expect(insert).toHaveBeenCalledWith({
            userId: 'u-1',
            username: 'sotetsu',
            displayName: 'Sotetsu',
            role: 'reporter',
        });
    });

    it('同じユーザー名（大文字小文字違いを含む）がいれば 422', async () => {
        createUser.mockResolvedValueOnce({
            data: { user: null },
            error: { status: 422, code: 'email_exists', name: 'AuthApiError', message: 'exists' },
        });
        await expect(RegisterUserUseCase.execute({ username: 'SOTETSU', password: 'Passw0rd!' })).rejects.toMatchObject({
            statusCode: 422,
            message: 'User already exists.',
        });
    });

    it('profiles への挿入が失敗したら作った利用者を消して投げ直す', async () => {
        createUser.mockResolvedValueOnce({ data: { user: { id: 'u-2' } }, error: null });
        insert.mockRejectedValueOnce(new Error('db down'));
        await expect(RegisterUserUseCase.execute({ username: 'abcd', password: 'Passw0rd!' })).rejects.toThrow('db down');
        expect(deleteUser).toHaveBeenCalledWith('u-2');
    });
});
```

Run: `npx vitest run src/libs/user/usecase/register-user.usecase.test.ts`
Expected: FAIL

- [ ] **Step 2: 実装する**

```ts
// src/libs/user/infrastructure/commands/profile.command.ts
import { SupabaseUtil } from '@utils/supabase';

/** 一意制約違反（Postgres） */
const UNIQUE_VIOLATION = '23505';

const insert = async (profile: {
    userId: string;
    username: string;
    displayName: string;
    role: string;
    createdAt?: string;
}): Promise<{ duplicate: boolean }> => {
    const { error } = await SupabaseUtil.adminClient()
        .from('profiles')
        .insert({
            user_id: profile.userId,
            username: profile.username,
            display_name: profile.displayName,
            role: profile.role,
            ...(profile.createdAt ? { created_at: profile.createdAt, updated_at: profile.createdAt } : {}),
        });

    if (error?.code === UNIQUE_VIOLATION) {
        return { duplicate: true };
    }

    if (error) {
        throw error;
    }

    return { duplicate: false };
};

export const ProfileCommand = {
    insert,
} as const;
```

```ts
// src/libs/user/usecase/register-user.usecase.ts
import { AuthEmail } from '@libs/auth/usecase/auth-email';
import { SupabaseUtil } from '@utils/supabase';
import createHttpError from 'http-errors';
import { StatusCodes } from 'http-status-codes';
import { ProfileCommand } from '../infrastructure/commands/profile.command';
import { CreateUserDto } from './dtos/create-user.dto';

const DEFAULT_ROLE = 'reporter';

const execute = async (dto: CreateUserDto): Promise<void> => {
    const { username, password } = dto;
    const admin = SupabaseUtil.adminClient();

    const { data, error } = await admin.auth.admin.createUser({
        email: AuthEmail.fromUsername(username),
        password,
        email_confirm: true,
    });

    if (error?.code === 'email_exists' || error?.status === 422) {
        throw createHttpError(StatusCodes.UNPROCESSABLE_ENTITY, 'User already exists.');
    }

    if (error || !data.user) {
        throw error ?? new Error('Failed to create the user.');
    }

    try {
        const { duplicate } = await ProfileCommand.insert({
            userId: data.user.id,
            username: username.toLowerCase(),
            displayName: username,
            role: DEFAULT_ROLE,
        });
        if (duplicate) {
            throw createHttpError(StatusCodes.UNPROCESSABLE_ENTITY, 'User already exists.');
        }
    } catch (e) {
        await admin.auth.admin.deleteUser(data.user.id);
        throw e;
    }
};

export const RegisterUserUseCase = {
    execute,
} as const;
```

- [ ] **Step 3: テスト・型**

Run: `npx vitest run`
Run: `npx tsc --noEmit`
Expected: PASS・エラー無し

- [ ] **Step 4: Commit**

```bash
git add src/libs/user
git commit -m "feat: :sparkles: 新規登録を Supabase の管理 API で行い、profiles に表示名と役割を入れる"
```

---

### Task 11: プロフィールを profiles から返す

**Files:**
- Create: `src/libs/user/infrastructure/queries/profile.query.ts`
- Modify: `src/libs/user/usecase/get-user-profile.usecase.ts`・`src/libs/user/usecase/dtos/get-user-profile.dto.ts`・`src/libs/user/usecase/dtos/user-details.dto.ts`
- Modify: `src/functions/get-user-profile/handler.ts`
- Test: `src/libs/user/usecase/get-user-profile.usecase.test.ts`

**Interfaces:**
- Consumes: `ResolveSessionUseCase`・`AuthCookie`・`SupabaseUtil.adminClient`
- Produces: `GetUserProfileUseCase.execute(cookies): Promise<{ user: UserDetailsDto; session: AuthSessionDto; refreshed: boolean }>`。`UserDetailsDto` は `{ userId, username, displayName, role, createdAt, updatedAt }`（`password` を外す。client に返す形は今と同じ）

- [ ] **Step 1: 失敗するテストを書く**

```ts
// src/libs/user/usecase/get-user-profile.usecase.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

const resolve = vi.fn();
vi.mock('@libs/auth/usecase/resolve-session.usecase', () => ({ ResolveSessionUseCase: { execute: resolve } }));
const getClaims = vi.fn();
vi.mock('@utils/supabase', () => ({ SupabaseUtil: { adminClient: () => ({ auth: { getClaims } }) } }));
const findByUserId = vi.fn();
vi.mock('../infrastructure/queries/profile.query', () => ({ ProfileQuery: { findByUserId } }));

const { GetUserProfileUseCase } = await import('./get-user-profile.usecase');

const SESSION = { accessToken: 'a', refreshToken: 'r', expiresAt: 1 };
const PROFILE = {
    userId: 'u-1',
    username: 'Sotetsu',
    displayName: 'Sotetsu',
    role: 'reporter',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
};

describe('GetUserProfileUseCase', () => {
    beforeEach(() => vi.clearAllMocks());

    it('ゲストは 401', async () => {
        resolve.mockResolvedValueOnce({ kind: 'guest' });
        await expect(GetUserProfileUseCase.execute({})).rejects.toMatchObject({ statusCode: 401 });
    });

    it('検証した sub の profiles を返す', async () => {
        resolve.mockResolvedValueOnce({ kind: 'active', session: SESSION, refreshed: true });
        getClaims.mockResolvedValueOnce({ data: { claims: { sub: 'u-1' } }, error: null });
        findByUserId.mockResolvedValueOnce(PROFILE);
        await expect(GetUserProfileUseCase.execute({ refreshToken: 'r' })).resolves.toEqual({
            user: PROFILE,
            session: SESSION,
            refreshed: true,
        });
        expect(getClaims).toHaveBeenCalledWith('a');
        expect(findByUserId).toHaveBeenCalledWith('u-1');
    });

    it('profiles が無ければ 401', async () => {
        resolve.mockResolvedValueOnce({ kind: 'active', session: SESSION, refreshed: false });
        getClaims.mockResolvedValueOnce({ data: { claims: { sub: 'u-9' } }, error: null });
        findByUserId.mockResolvedValueOnce(null);
        await expect(GetUserProfileUseCase.execute({ accessToken: 'a', refreshToken: 'r' })).rejects.toMatchObject({
            statusCode: 401,
        });
    });
});
```

Run: `npx vitest run src/libs/user/usecase/get-user-profile.usecase.test.ts`
Expected: FAIL

- [ ] **Step 2: 実装する**

```ts
// src/libs/user/usecase/dtos/user-details.dto.ts
export type UserDetailsDto = {
    userId: string;
    /** 元の書き方（profiles.display_name）。client はこれをユーザー名として出す */
    username: string;
    displayName: string;
    role: string;
    createdAt: string;
    updatedAt: string;
};
```

```ts
// src/libs/user/usecase/dtos/get-user-profile.dto.ts
export type GetUserProfileDto = {
    accessToken?: string;
    refreshToken?: string;
};
```

```ts
// src/libs/user/infrastructure/queries/profile.query.ts
import { UserDetailsDto } from '@libs/user/usecase/dtos/user-details.dto';
import { SupabaseUtil } from '@utils/supabase';

const findByUserId = async (userId: string): Promise<UserDetailsDto | null> => {
    const { data, error } = await SupabaseUtil.adminClient()
        .from('profiles')
        .select('user_id, display_name, role, created_at, updated_at')
        .eq('user_id', userId)
        .maybeSingle();

    if (error) {
        throw error;
    }

    if (!data) {
        return null;
    }

    return {
        userId: data.user_id,
        username: data.display_name,
        displayName: data.display_name,
        role: data.role,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
    };
};

export const ProfileQuery = {
    findByUserId,
} as const;
```

```ts
// src/libs/user/usecase/get-user-profile.usecase.ts
import { AuthSessionDto } from '@libs/auth/usecase/dtos/auth-session.dto';
import { ResolveSessionUseCase } from '@libs/auth/usecase/resolve-session.usecase';
import { SupabaseUtil } from '@utils/supabase';
import createHttpError from 'http-errors';
import { StatusCodes } from 'http-status-codes';
import { ProfileQuery } from '../infrastructure/queries/profile.query';
import { GetUserProfileDto } from './dtos/get-user-profile.dto';
import { UserDetailsDto } from './dtos/user-details.dto';

/** トークンの口と同じく、切れかけなら更新してから読む（更新した Cookie は handler が書く） */
const execute = async (
    dto: GetUserProfileDto,
): Promise<{ user: UserDetailsDto; session: AuthSessionDto; refreshed: boolean }> => {
    const resolved = await ResolveSessionUseCase.execute(dto);

    if (resolved.kind === 'guest') {
        throw createHttpError(StatusCodes.UNAUTHORIZED, 'Unauthorized.');
    }

    const { data, error } = await SupabaseUtil.adminClient().auth.getClaims(resolved.session.accessToken);
    const userId = data?.claims.sub;

    if (error || !userId) {
        throw createHttpError(StatusCodes.UNAUTHORIZED, 'Unauthorized.');
    }

    const user = await ProfileQuery.findByUserId(userId);

    if (!user) {
        throw createHttpError(StatusCodes.UNAUTHORIZED, 'Unauthorized.');
    }

    return { user, session: resolved.session, refreshed: resolved.refreshed };
};

export const GetUserProfileUseCase = {
    execute,
} as const;
```

```ts
// src/functions/get-user-profile/handler.ts
import { GetUserProfileUseCase } from '@libs/user/usecase/get-user-profile.usecase';
import { APIGWUtil } from '@utils/api-gateway';
import { AuthCookie } from '@utils/auth-cookie';
import { middyfy } from '@utils/lambda';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

type TEvent = APIGatewayProxyEvent;
type TResult = APIGatewayProxyResult;

const getUserProfile = middyfy.asAPIGWHandler<TEvent, TResult>().handler(async (event) => {
    const { user, session, refreshed } = await GetUserProfileUseCase.execute(AuthCookie.read(event));

    return APIGWUtil.formatJSONResponseV2({
        ...(refreshed ? { multiValueHeaders: { 'Set-Cookie': AuthCookie.issue(session) } } : {}),
        body: user,
    });
});

export const main = getUserProfile;
```

- [ ] **Step 3: テスト・型**

Run: `npx vitest run`
Run: `npx tsc --noEmit`
Expected: PASS・エラー無し

- [ ] **Step 4: Commit**

```bash
git add src/libs/user src/functions/get-user-profile
git commit -m "feat: :sparkles: プロフィールを Supabase のトークンと profiles から返す"
```

---

### Task 12: 利用者の移行スクリプト（DynamoDB → Supabase）

**Files:**
- Create: `scripts/migrate-users-to-supabase.ts`
- Create: `src/libs/user/usecase/to-supabase-user.ts`
- Modify: `package.json`（scripts `"migrate:users": "tsx ./scripts/migrate-users-to-supabase.ts"`）
- Test: `src/libs/user/usecase/to-supabase-user.test.ts`

**Interfaces:**
- Consumes: `AuthEmail.fromUsername`・`ProfileCommand.insert`・`SupabaseUtil.adminClient`
- Produces: `toSupabaseUser(item: LegacyUserItem): { auth: { id; email; password_hash; email_confirm: true }; profile: { userId; username; displayName; role; createdAt } }`

- [ ] **Step 1: 失敗するテストを書く**

```ts
// src/libs/user/usecase/to-supabase-user.test.ts
import { describe, expect, it } from 'vitest';
import { toSupabaseUser } from './to-supabase-user';

describe('toSupabaseUser', () => {
    it('id と argon2 のハッシュをそのまま使い、ユーザー名は小文字・表示名は元の書き方', () => {
        expect(
            toSupabaseUser({
                id: 'users#id#0b5c1a0e-0000-4000-8000-000000000001',
                username: 'Sotetsu',
                password: '$argon2id$v=19$m=65536,t=3,p=4$c2FsdA$aGFzaA',
                displayName: 'Sotetsu',
                role: 'editor',
                createdAt: 1_700_000_000,
            }),
        ).toEqual({
            auth: {
                id: '0b5c1a0e-0000-4000-8000-000000000001',
                email: 'sotetsu@users.sotetsu-lab.invalid',
                password_hash: '$argon2id$v=19$m=65536,t=3,p=4$c2FsdA$aGFzaA',
                email_confirm: true,
            },
            profile: {
                userId: '0b5c1a0e-0000-4000-8000-000000000001',
                username: 'sotetsu',
                displayName: 'Sotetsu',
                role: 'editor',
                createdAt: '2023-11-14T22:13:20.000Z',
            },
        });
    });

    it('argon2 でないハッシュは投げる（取り込みで黙って壊さない）', () => {
        expect(() =>
            toSupabaseUser({
                id: 'users#id#0b5c1a0e-0000-4000-8000-000000000001',
                username: 'a',
                password: 'plain',
                displayName: 'a',
                role: 'reporter',
                createdAt: 1,
            }),
        ).toThrow();
    });
});
```

Run: `npx vitest run src/libs/user/usecase/to-supabase-user.test.ts`
Expected: FAIL

- [ ] **Step 2: 変換を書く**

```ts
// src/libs/user/usecase/to-supabase-user.ts
import { AuthEmail } from '@libs/auth/usecase/auth-email';

/** DynamoDB 管理テーブルの users#id#… の行（Cognito 時代） */
export type LegacyUserItem = {
    id: string;
    username: string;
    password: string;
    displayName: string;
    role: string;
    createdAt: number;
};

const ID_PREFIX = 'users#id#';

export const toSupabaseUser = (item: LegacyUserItem) => {
    if (!item.password.startsWith('$argon2')) {
        throw new Error(`Unexpected password hash format for ${item.id}`);
    }

    const userId = item.id.replace(ID_PREFIX, '');

    return {
        auth: {
            id: userId,
            email: AuthEmail.fromUsername(item.username),
            password_hash: item.password,
            email_confirm: true as const,
        },
        profile: {
            userId,
            username: item.username.toLowerCase(),
            displayName: item.displayName,
            role: item.role,
            createdAt: new Date(item.createdAt * 1000).toISOString(),
        },
    };
};
```

Run: `npx vitest run src/libs/user/usecase/to-supabase-user.test.ts`
Expected: PASS

- [ ] **Step 3: スクリプトを書く**

```ts
// scripts/migrate-users-to-supabase.ts
/**
 * DynamoDB の利用者を Supabase Auth と profiles に移す。何度流しても同じ結果（既にいる人は飛ばす）。
 * 使い方（サンドボックスの外・aws-vault で）:
 *   MANAGEMENT_DYNAMODB_TABLE_NAME=… MANAGEMENT_DYNAMODB_TABLE_KEY_DATA_GSI_NAME=… \
 *   SUPABASE_URL=… SUPABASE_SECRET_KEY=… npm run migrate:users -- --dry-run
 * 個人情報（ユーザー名）はログに出さず、件数と userId だけを出す。
 */
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { ProfileCommand } from '@libs/user/infrastructure/commands/profile.command';
import { LegacyUserItem, toSupabaseUser } from '@libs/user/usecase/to-supabase-user';
import { DynamoDBUtil } from '@utils/dynamodb';
import { SupabaseUtil } from '@utils/supabase';

const dryRun = process.argv.includes('--dry-run');

const readLegacyUsers = async (): Promise<LegacyUserItem[]> => {
    const items: LegacyUserItem[] = [];
    let lastKey: Record<string, unknown> | undefined;
    do {
        const res = await DynamoDBUtil.documentClient.send(
            new QueryCommand({
                TableName: process.env.MANAGEMENT_DYNAMODB_TABLE_NAME,
                IndexName: process.env.MANAGEMENT_DYNAMODB_TABLE_KEY_DATA_GSI_NAME,
                KeyConditionExpression: '#k = :k',
                ExpressionAttributeNames: { '#k': 'key' },
                ExpressionAttributeValues: { ':k': 'type#users' },
                ExclusiveStartKey: lastKey,
            }),
        );
        items.push(...((res.Items ?? []) as LegacyUserItem[]));
        lastKey = res.LastEvaluatedKey;
    } while (lastKey);
    return items;
};

const main = async () => {
    const users = (await readLegacyUsers()).map(toSupabaseUser);
    const lowered = new Set(users.map((u) => u.profile.username));
    console.log(`users=${users.length} caseCollisions=${users.length - lowered.size} dryRun=${dryRun}`);

    if (users.length !== lowered.size) {
        throw new Error('Usernames collide when lowercased. Stop and ask the user.');
    }

    if (dryRun) return;

    const admin = SupabaseUtil.adminClient();
    let created = 0;
    let skipped = 0;
    const failed: string[] = [];

    for (const user of users) {
        const existing = await admin.auth.admin.getUserById(user.auth.id);
        if (existing.data.user) {
            skipped++;
        } else {
            // supabase-js の型には password_hash が無いが、管理 API はそのまま受け付ける（supabase/auth AdminUserParams）
            const { error } = await admin.auth.admin.createUser(
                user.auth as unknown as Parameters<typeof admin.auth.admin.createUser>[0],
            );
            if (error) {
                failed.push(user.auth.id);
                continue;
            }
            created++;
        }
        const { duplicate } = await ProfileCommand.insert(user.profile);
        if (duplicate) {
            // 既に profiles がある（前回の実行で入った）
        }
    }

    console.log(`created=${created} skipped=${skipped} failed=${failed.length}`);
    failed.forEach((id) => console.log(`failed userId=${id}`));
    if (failed.length > 0) process.exitCode = 1;
};

await main();
```

`package.json` の scripts に `"migrate:users": "tsx ./scripts/migrate-users-to-supabase.ts"` を足す（`tsx` は `presls` で既に使っている）。`@libs`・`@utils` の別名が `tsx` で解決できなければ、`tsconfig.paths.json` を読む `tsx --tsconfig tsconfig.json` に変える。

- [ ] **Step 4: 型と dry-run**

Run: `npx tsc --noEmit`
Expected: エラー無し

本番の dry-run（ユーザーの承認を得て、サンドボックスの外で `aws-vault exec administrator --` を付けて）:

Run: `MANAGEMENT_DYNAMODB_TABLE_NAME=sotetsu-lab-v3-prod-backend-management-ddb-table MANAGEMENT_DYNAMODB_TABLE_KEY_DATA_GSI_NAME=sotetsu-lab-v3-prod-backend-management-ddb-table-key-data-gsi SUPABASE_URL=https://nofubcikiabamlnlxpko.supabase.co SUPABASE_SECRET_KEY=<secret> npm run migrate:users -- --dry-run`
Expected: `users=105 caseCollisions=0 dryRun=true`（人数は増えていてもよい。衝突が 0 でなければ止める）

- [ ] **Step 5: Commit**

```bash
git add package.json scripts/migrate-users-to-supabase.ts src/libs/user/usecase/to-supabase-user.ts src/libs/user/usecase/to-supabase-user.test.ts
git commit -m "feat: :sparkles: DynamoDB の利用者をパスワードのハッシュごと Supabase に移すスクリプトを足す"
```

---

### Task 13: backend から Cognito・自前ユーザー・セッションを外す

**Files:**
- Delete: `src/functions/get-token/`（`/api/token`）・`src/utils/openid.ts`・`src/libs/auth/infrastructure/`（session・token）・`src/libs/user/infrastructure/commands/user.command.ts`・`src/libs/user/infrastructure/queries/user.query.ts`・`src/configs/session.ts`
- Modify: `src/functions/index.ts`・`serverless.ts`・`package.json`

- [ ] **Step 1: 参照が残っていないか調べてから消す**

Run: `git grep -n -e "get-token" -e "OpenIDUtil" -e "SessionQuery" -e "SessionCommand" -e "TokenQuery" -e "UserQuery" -e "UserCommand" -e "SessionConfig" -- src scripts serverless.ts`
Expected: 消すファイル自身と `serverless.ts` の import だけ（ほかから使われていたら止めて報告）

Run: `git rm -r src/functions/get-token src/utils/openid.ts src/libs/auth/infrastructure src/libs/user/infrastructure/commands/user.command.ts src/libs/user/infrastructure/queries/user.query.ts src/configs/session.ts`

- [ ] **Step 2: serverless.ts を直す**

- `import getToken from '@functions/get-token';` と `functions` の `getToken` を消す
- `provider.environment` から `IDP_URL`・`CLIENT_ID`・`CLIENT_SECRET`・`MANAGEMENT_DYNAMODB_TABLE_NAME`・`MANAGEMENT_DYNAMODB_TABLE_KEY_DATA_GSI_NAME`・`CACHE_DYNAMODB_TABLE_NAME` を消す
- `iamRoleStatements` の Resource から `ManagementDynamoDBTable`（本体と `/index/*`）と `CacheDynamoDBTable` を消す
- `resources.Resources.ManagementDynamoDBTable` と `CacheDynamoDBTable` に `DeletionPolicy: 'Retain'` と `UpdateReplacePolicy: 'Retain'` を足す（資源の定義は残す。外すのは切り替え手順の 7）

`src/functions/index.ts` から `getToken` の export を消す。

- [ ] **Step 3: 使わなくなった依存を外す**

Run: `git grep -n -e "argon2" -e "openid-client" -e "from 'uuid'" -- src scripts`
Expected: 何も出ない（出たら外さない）

Run: `npm uninstall argon2 openid-client uuid`

`serverless.ts` の `serverless-layers` の `customInstallationCommand` と `customHash` のコメントは argon2 のためのもの。argon2 が無くなったので、`customInstallationCommand` と `customHash` の 2 行とそのコメントを消す（既定の install に戻す）。

- [ ] **Step 4: テスト・型・serverless の展開**

Run: `npx vitest run`
Run: `npx tsc --noEmit`
Run: `npm run presls`（serverless.ts → serverless.yaml）
Expected: PASS・エラー無し・`serverless.yaml` に `get-token` が無く、2 つの表に `DeletionPolicy: Retain` がある

- [ ] **Step 5: Commit**

```bash
git add -A src serverless.ts serverless.yaml package.json package-lock.json
git commit -m "refactor: :fire: Cognito のトークン発行と DynamoDB の利用者・セッションを外し、/api/token を消す"
```

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
