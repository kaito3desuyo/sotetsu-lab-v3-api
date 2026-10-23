# 目撃の投稿を登録者だけにする（api）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 目撃の投稿と trip-blocks の書き込みを役割で絞り、目撃の投稿者を記録し、保存に成功したときだけ socket の broadcast 関数に合図を頼む。

**Architecture:** 投稿者はサブテーブル `operation_sighting_authors` に入れる（本体は触らない）。役割は既存の `@RBAC` と `RBACGuard`、利用者は `AuthGuard` が入れる `req.auth`。合図は `src/core/modules/socket-signal/` の Nest モジュールが `@aws-sdk/client-lambda` で socket の関数を `InvocationType: Event` で呼ぶ。失敗しても書き込みは成功で返す。

**Tech Stack:** NestJS 11（ESM・`.js` 付き import）、TypeORM 1.x、Vitest＋SWC、class-validator、serverless（osls 4）、`@aws-sdk/client-lambda`

**Spec:** `docs/superpowers/specs/2026-10-23-registered-only-posting-design.md`

## Global Constraints

-   import は `.js` 付き（ESM）。既存のファイルにならう
-   クエリは createQueryBuilder だけを使う。`find`・`findOne`・`getMany` 系の Repository の検索を新しく書かない（保存は既存の command と同じく `repo.save` でよい）
-   migration は `npm run migration:generate` で作る。手書きしない。FK・インデックスの名前は明示しない（既定のハッシュ名）
-   `auth.users` への FK は `AuthUserModel`（`synchronize: false`）経由で張る
-   core の新しい部品は `src/core/modules/<役目>/` の Nest モジュールにし、クラス名に Service を付けない。引数はオブジェクトで受ける
-   テスト（vitest・swc）と migration はサンドボックスの外で流す（中だと `ERR_SWC_NATIVE_CACHE`・Supabase の DNS 不可）
-   ローカルの api は本番 DB を読む。列や表を足すコードをローカルで動かす前に、本番に migration を流す（流すのはユーザーが `!` で）
-   コミットは Conventional Commits＋絵文字（例: `feat: :sparkles: …`）。サンドボックスの外で署名する
-   出す順は socket（broadcast を足す）→ api → client → socket（`sendSighting` を消す）。api のデプロイは socket の broadcast のデプロイの後
-   spec 7 章の「編集者のトークンの `user_role` が 1 つの値か」は確認済み: `custom_access_token_hook` は `profiles.role`（text 1 つ）をそのまま `user_role` に入れるだけなので、`RBACGuard` の完全一致で足りる

## Review Focus

1.  ローカルや CI のように `SOCKET_BROADCAST_FUNCTION_NAME` が空・AWS の資格情報が無いとき → 書き込みは今までどおり成功し、合図は送らない（落ちない）— Task 2 のテスト
2.  Invoke が例外を投げた・タイムアウトした → 書き込みの応答は成功のまま、warn のログだけ — Task 2・Task 3 のテスト
3.  Service Worker に残った古い client が、無効化・復元の body に `userId`（他人の ID も可）を入れて送ってくる → 黙って捨て、JWT の `sub` を記録する（`whitelist: true`・`forbidNonWhitelisted: false`）— Task 3 のテスト
4.  ログインはしているが `profiles` が無い・役割が無い利用者（`user_role` 無し）→ 投稿は 403 — Task 3 のテスト（匿名と同じ扱い）
5.  投稿のトランザクションが途中で失敗した → 投稿者の行も残らず、合図も出ない — Task 3 のテスト

---

### Task 1: 投稿者の表と管理ログの FK

**Files:**
- Create: `src/libs/operation-sighting/infrastructure/models/operation-sighting-author.model.ts`
- Modify: `src/libs/operation-sighting/infrastructure/models/operation-sighting.model.ts`
- Modify: `src/libs/operation-sighting/infrastructure/models/operation-sighting-management-log.model.ts`
- Modify: `src/core/configs/entities.ts`
- Modify: `src/libs/operation-sighting/operation-sighting.libs.module.ts`
- Create: `db/migrations/<timestamp>-AddOperationSightingAuthors.ts`（generate で作る）

**Interfaces:**
- Produces: `OperationSightingAuthorModel { operationSightingId: string; userId: string; createdAt?: Date; updatedAt?: Date }`（表 `operation_sighting_authors`）

- [ ] **Step 1: モデルを作る**

```ts
// src/libs/operation-sighting/infrastructure/models/operation-sighting-author.model.ts
import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    OneToOne,
    PrimaryColumn,
    UpdateDateColumn,
    type Relation,
} from 'typeorm';
import { AuthUserModel } from '../../../user/infrastructure/models/auth-user.model.js';
import { OperationSightingModel } from './operation-sighting.model.js';

/**
 * 目撃を投稿した利用者。2026-10-23 の登録制から記録する（それより前の目撃には行が無い）。
 * 目撃の本体には列を足さずにここへ分けた。投稿者名は画面に出さず、運営の調べ物にだけ使う。
 * user_id の索引は「この人の投稿」を引くため。
 */
@Entity({ name: 'operation_sighting_authors' })
export class OperationSightingAuthorModel {
    @PrimaryColumn('uuid')
    operationSightingId!: string;

    @OneToOne(() => OperationSightingModel, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'operation_sighting_id' })
    readonly operationSighting?: Relation<OperationSightingModel>;

    @Column('uuid')
    @Index()
    userId!: string;

    @ManyToOne(() => AuthUserModel)
    @JoinColumn({ name: 'user_id' })
    readonly authUser?: Relation<AuthUserModel>;

    @CreateDateColumn({ type: 'timestamptz', precision: 3 })
    createdAt?: Date;

    @UpdateDateColumn({ type: 'timestamptz', precision: 3 })
    updatedAt?: Date;
}
```

- [ ] **Step 2: 管理ログに auth.users への FK を足す**

`operation-sighting-management-log.model.ts` の `userId` の下に足す:

```ts
    @ManyToOne(() => AuthUserModel)
    @JoinColumn({ name: 'user_id' })
    readonly authUser?: Relation<AuthUserModel>;
```

（`AuthUserModel` を `../../../user/infrastructure/models/auth-user.model.js` から import）

- [ ] **Step 3: 登録する**

`src/core/configs/entities.ts` の `ENTITIES` に `OperationSightingAuthorModel` を足す。`operation-sighting.libs.module.ts` の `TypeOrmModule.forFeature([...])` にも足す。

- [ ] **Step 4: migration を作る（サンドボックスの外）**

Run: `npm run migration:generate -- db/migrations/AddOperationSightingAuthors`
Expected: `db/migrations/<timestamp>-AddOperationSightingAuthors.ts` ができ、`up` に次の 3 つだけが入る。
- `CREATE TABLE "operation_sighting_authors"`（`operation_sighting_id` PK・`user_id`・`created_at`・`updated_at`）と `user_id` の索引
- `operation_sighting_authors` の FK 2 本（`operation_sightings(id) ON DELETE CASCADE`・`auth.users(id)`）
- `operation_sighting_management_logs` の `user_id` から `auth.users(id)` への FK

それ以外の差分（既存の表の制約の作り直しなど）が出たら、止めて報告する（モデルと本番のずれなので、この migration に混ぜない）。

- [ ] **Step 5: 本番の値が FK を通るか確かめる**

Supabase に読み取りで流す:

```sql
select count(*) from operation_sighting_management_logs l
where not exists (select 1 from auth.users u where u.id = l.user_id);
```

Expected: `0`（2026-10-23 時点で 0 を確認済み。0 でなければ止めて報告）

- [ ] **Step 6: ビルドが通るか**

Run: `npm run build`
Expected: エラー無し

- [ ] **Step 7: コミット**

```bash
git add src/libs/operation-sighting/infrastructure/models src/core/configs/entities.ts src/libs/operation-sighting/operation-sighting.libs.module.ts db/migrations
git commit -m "feat: :card_file_box: 目撃の投稿者の表と管理ログの外部キーを足す"
```

- [ ] **Step 8: 本番に migration を流す（ユーザー）**

ユーザーに `! npm run migration:run` を流してもらう（分類器が止めるため）。流したら、Supabase で `operation_sighting_authors` があることを確かめる。

---

### Task 2: socket への合図の部品

**Files:**
- Create: `src/core/modules/socket-signal/socket-signal.ts`
- Create: `src/core/modules/socket-signal/socket-signal.module.ts`
- Test: `src/core/modules/socket-signal/socket-signal.spec.ts`
- Modify: `package.json`（`@aws-sdk/client-lambda` を dependencies に）
- Modify: `serverless.ts`（environment と IAM）

**Interfaces:**
- Produces: `type SocketSignalType = 'sighting' | 'timetable'`、`class SocketSignal { send(params: { type: SocketSignalType }): Promise<void> }`（決して例外を投げない）、`SocketSignalModule`（`SocketSignal` を export する）

- [ ] **Step 1: 依存を足す**

Run: `npm install @aws-sdk/client-lambda`
Expected: `package.json` の `dependencies` に入る（devDependencies ではない。serverless-layers のレイヤーに載るように）

- [ ] **Step 2: 失敗するテストを書く**

```ts
// src/core/modules/socket-signal/socket-signal.spec.ts
import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';
import { SocketSignal } from './socket-signal.js';

describe('SocketSignal', () => {
    const send = vi.fn();
    const client = { send } as unknown as LambdaClient;
    const ORIGINAL = process.env.SOCKET_BROADCAST_FUNCTION_NAME;

    beforeEach(() => {
        send.mockReset();
        process.env.SOCKET_BROADCAST_FUNCTION_NAME = 'broadcast-fn';
    });

    afterAll(() => {
        process.env.SOCKET_BROADCAST_FUNCTION_NAME = ORIGINAL;
    });

    it('関数を Event で呼び、type だけを送る', async () => {
        send.mockResolvedValue({ StatusCode: 202 });
        await new SocketSignal(client).send({ type: 'sighting' });

        expect(send).toHaveBeenCalledTimes(1);
        const command = send.mock.calls[0][0] as InvokeCommand;
        expect(command.input.FunctionName).toBe('broadcast-fn');
        expect(command.input.InvocationType).toBe('Event');
        expect(
            JSON.parse(Buffer.from(command.input.Payload as Uint8Array).toString()),
        ).toEqual({ type: 'sighting' });
    });

    it('関数名が空なら呼ばない', async () => {
        process.env.SOCKET_BROADCAST_FUNCTION_NAME = '';
        await new SocketSignal(client).send({ type: 'timetable' });
        expect(send).not.toHaveBeenCalled();
    });

    it('呼び出しが失敗しても例外を投げない', async () => {
        send.mockRejectedValue(new Error('AccessDenied'));
        await expect(
            new SocketSignal(client).send({ type: 'sighting' }),
        ).resolves.toBeUndefined();
    });
});
```

- [ ] **Step 3: 落ちることを確かめる（サンドボックスの外）**

Run: `npx vitest run src/core/modules/socket-signal`
Expected: FAIL（`./socket-signal.js` が無い）

- [ ] **Step 4: 実装する**

```ts
// src/core/modules/socket-signal/socket-signal.ts
import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';
import { Injectable, Logger, Optional } from '@nestjs/common';

export type SocketSignalType = 'sighting' | 'timetable';

/**
 * 書き込みに成功したことを、socket の broadcast 関数に知らせる。
 * 待たずに頼むだけ（InvocationType: Event）。失敗しても書き込みは成功のまま返したいので、例外を投げずにログだけ残す。
 * 関数名が無い（ローカル・テスト）なら何もしない。
 */
@Injectable()
export class SocketSignal {
    readonly #logger = new Logger(SocketSignal.name);
    readonly #client: LambdaClient;

    constructor(@Optional() client?: LambdaClient) {
        this.#client = client ?? new LambdaClient({});
    }

    async send(params: { type: SocketSignalType }): Promise<void> {
        const functionName = process.env.SOCKET_BROADCAST_FUNCTION_NAME;
        if (!functionName) {
            return;
        }

        try {
            await this.#client.send(
                new InvokeCommand({
                    FunctionName: functionName,
                    InvocationType: 'Event',
                    Payload: Buffer.from(JSON.stringify({ type: params.type })),
                }),
            );
        } catch (e) {
            const error = e instanceof Error ? e : new Error(String(e));
            this.#logger.warn(
                `socket への合図に失敗しました: ${error.name} ${error.message}`,
            );
        }
    }
}
```

```ts
// src/core/modules/socket-signal/socket-signal.module.ts
import { Module } from '@nestjs/common';
import { SocketSignal } from './socket-signal.js';

@Module({
    providers: [SocketSignal],
    exports: [SocketSignal],
})
export class SocketSignalModule {}
```

- [ ] **Step 5: 通ることを確かめる**

Run: `npx vitest run src/core/modules/socket-signal`
Expected: PASS（3 件）

- [ ] **Step 6: serverless.ts に関数名と権限を足す**

`provider.environment` に足す（`prefix` と同じく `\${sls:stage}` は TypeScript の文字列の中なのでエスケープする）:

```ts
            SOCKET_BROADCAST_FUNCTION_NAME: `sotetsu-lab-v3-\${sls:stage}-socket-broadcast-lambda`,
```

`provider.iam.role` に `statements` を足す:

```ts
        iam: {
            role: {
                name: '${param:prefix}-lambda-role',
                statements: [
                    {
                        Effect: 'Allow',
                        Action: ['lambda:InvokeFunction'],
                        Resource: [
                            `arn:aws:lambda:ap-northeast-1:\${aws:accountId}:function:sotetsu-lab-v3-\${sls:stage}-socket-broadcast-lambda`,
                        ],
                    },
                ],
            },
        },
```

関数名は socket の `serverless.ts` の `prefix`（`sotetsu-lab-v3-${stage}-socket`）＋ socket の関数定義の `name: '${param:prefix}-broadcast-lambda'` と一致させる（socket の計画の Task 1）。

- [ ] **Step 7: 型とビルド**

Run: `npm run build`
Expected: エラー無し

- [ ] **Step 8: コミット**

```bash
git add src/core/modules/socket-signal package.json package-lock.json serverless.ts
git commit -m "feat: :sparkles: 書き込みの成功を socket に知らせる部品を足す"
```

---

### Task 3: 目撃の投稿・無効化・復元

**Files:**
- Modify: `src/libs/operation-sighting/presentation/operation-sighting.v3.controller.ts`
- Modify: `src/libs/operation-sighting/usecase/operation-sighting.v3.service.ts`（`post`・`invalidate`・`restore`）
- Modify: `src/libs/operation-sighting/usecase/dtos/invalidate-operation-sighting.dto.ts`
- Modify: `src/libs/operation-sighting/usecase/dtos/restore-operation-sighting.dto.ts`
- Create: `src/libs/operation-sighting/infrastructure/command/operation-sighting-author.command.ts`
- Modify: `src/libs/operation-sighting/operation-sighting.libs.module.ts`（command を providers・exports に）
- Modify: `src/libs/operation-sighting/operation-sighting.v3.module.ts`（`SocketSignalModule` を imports に）
- Test: `src/libs/operation-sighting/usecase/operation-sighting.v3.service.spec.ts`
- Test: `src/libs/operation-sighting/presentation/operation-sighting.v3.controller.spec.ts`（新規）

**Interfaces:**
- Consumes: `OperationSightingAuthorModel`（Task 1）、`SocketSignal.send({ type })`（Task 2）
- Produces:
  - `OperationSightingAuthorCommand.create(params: { operationSightingId: string; userId: string }, manager?: EntityManager): Promise<void>`
  - `OperationSightingV3Service.post(params: PostOperationSightingDto & { userId: string })`
  - `OperationSightingV3Service.invalidate(params: { operationSightingId: string; userId: string; reason: string })`（`restore` も同じ形）
  - `InvalidateOperationSightingDto` / `RestoreOperationSightingDto` は `reason` だけ

- [ ] **Step 1: command を作る**

```ts
// src/libs/operation-sighting/infrastructure/command/operation-sighting-author.command.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { OperationSightingAuthorModel } from '../models/operation-sighting-author.model.js';

@Injectable()
export class OperationSightingAuthorCommand {
    constructor(
        @InjectRepository(OperationSightingAuthorModel)
        private readonly repository: Repository<OperationSightingAuthorModel>,
    ) {}

    async create(
        params: { operationSightingId: string; userId: string },
        manager?: EntityManager,
    ): Promise<void> {
        const repo = manager
            ? manager.getRepository(OperationSightingAuthorModel)
            : this.repository;
        await repo.insert({
            operationSightingId: params.operationSightingId,
            userId: params.userId,
        });
    }
}
```

`operation-sighting.libs.module.ts` の `providers`・`exports` に `OperationSightingAuthorCommand` を足す。`operation-sighting.v3.module.ts` の `imports` に `SocketSignalModule` を足す。

- [ ] **Step 2: service のテストを足す（失敗する）**

`operation-sighting.v3.service.spec.ts` の mock に足し、`buildService` の providers に登録する:

```ts
const mockAuthorCreate: AnyMock = vi.fn();
const mockOperationSightingAuthorCommand = { create: mockAuthorCreate };
const mockSignalSend: AnyMock = vi.fn().mockResolvedValue(undefined);
const mockSocketSignal = { send: mockSignalSend };
// providers:
//   { provide: OperationSightingAuthorCommand, useValue: mockOperationSightingAuthorCommand },
//   { provide: SocketSignal, useValue: mockSocketSignal },
```

既存の `service.post({ ...baseParams })` の呼び出し（783 行あたりの describe）はすべて `userId: 'user-1'` を足した形に直す。そのうえで、同じ describe に足す:

```ts
    it('post: 投稿者を同じトランザクションで記録し、保存の後に sighting の合図を送る', async () => {
        // 既存の成功ケースと同じ前準備（baseParams・formation・operation・mockSave）を使う
        mockSave.mockResolvedValue({ operationSightingId: 'new-id' });

        await service.post({ ...baseParams, userId: 'user-1' });

        expect(mockAuthorCreate).toHaveBeenCalledWith(
            { operationSightingId: 'new-id', userId: 'user-1' },
            mockManager,
        );
        expect(mockSignalSend).toHaveBeenCalledWith({ type: 'sighting' });
    });

    it('post: 保存に失敗したら合図を送らない', async () => {
        mockSave.mockRejectedValue(new Error('db down'));

        await expect(
            service.post({ ...baseParams, userId: 'user-1' }),
        ).rejects.toThrow('db down');
        expect(mockSignalSend).not.toHaveBeenCalled();
    });
```

invalidate・restore の既存のテストの末尾に `expect(mockSignalSend).toHaveBeenCalledWith({ type: 'sighting' });` を足す（呼び出しの形 `{ operationSightingId, userId, reason }` は今のまま）。

- [ ] **Step 3: 落ちることを確かめる**

Run: `npx vitest run src/libs/operation-sighting/usecase`
Expected: FAIL（`OperationSightingAuthorCommand`・`SocketSignal` が注入されていない・`mockAuthorCreate` が呼ばれていない）

- [ ] **Step 4: service を直す**

constructor に足す:

```ts
        private readonly operationSightingAuthorCommand: OperationSightingAuthorCommand,
        private readonly socketSignal: SocketSignal,
```

`post` の引数を `params: PostOperationSightingDto & { userId: string }` にし、トランザクションを次のようにする:

```ts
        const saved = await this.dataSource.transaction(async (manager) => {
            const saved = await this.operationSightingCommand.save(
                domain,
                manager,
            );
            await this.operationSightingAuthorCommand.create(
                {
                    operationSightingId: saved.operationSightingId,
                    userId: params.userId,
                },
                manager,
            );
            await this.#applyCacheAction(
                cacheAction,
                saved.operationSightingId,
                manager,
            );
            return saved;
        });
        await this.socketSignal.send({ type: 'sighting' });
        return saved;
```

`invalidate`・`restore` の引数の型を `params: { operationSightingId: string; userId: string; reason: string }` にし、最後の `return this.dataSource.transaction(...)` を `const saved = await this.dataSource.transaction(...)` に替えて、その後に `await this.socketSignal.send({ type: 'sighting' }); return saved;` を置く。

- [ ] **Step 5: DTO から userId を消す**

```ts
// invalidate-operation-sighting.dto.ts（restore も同じ形・クラス名だけ違う）
import { IsString } from 'class-validator';

export class InvalidateOperationSightingDto {
    @IsString()
    reason!: string;
}
```

- [ ] **Step 6: service のテストが通るか**

Run: `npx vitest run src/libs/operation-sighting/usecase`
Expected: PASS

- [ ] **Step 7: controller のテストを書く（失敗する）**

```ts
// src/libs/operation-sighting/presentation/operation-sighting.v3.controller.spec.ts
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AuthContext } from '../../../core/modules/auth/auth-context.js';
import { AuthGuard } from '../../../core/modules/auth/auth.guard.js';
import { CacheControlModule } from '../../../core/modules/cache-control/cache-control.module.js';
import { validationPipeOptions } from '../../../core/configs/validator-options.js';
import { Role } from '../../../core/modules/rbac/role.enum.js';
import { OperationSightingV3Service } from '../usecase/operation-sighting.v3.service.js';
import { OperationSightingV3Controller } from './operation-sighting.v3.controller.js';

vi.mock('../../../core/modules/auth/auth.guard.js', () => ({
    AuthGuard: class {},
}));

const SIGHTING_ID = '3f0b6a5e-8a52-4c1c-9d0a-2b5d1b8e7a11';

describe('OperationSightingV3Controller（書き込みの役割と利用者）', () => {
    let app: INestApplication;
    let auth: AuthContext;
    const service = {
        post: vi.fn(),
        invalidate: vi.fn(),
        restore: vi.fn(),
    };
    const body = {
        agencyId: SIGHTING_ID,
        formationOrVehicleNumber: '8701',
        operationNumber: '41',
        sightingTime: '2026-10-23T01:00:00.000Z',
    };

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [CacheControlModule],
            controllers: [OperationSightingV3Controller],
            providers: [
                { provide: OperationSightingV3Service, useValue: service },
            ],
        })
            .overrideGuard(AuthGuard)
            .useValue({
                canActivate: (ctx: any) => {
                    ctx.switchToHttp().getRequest().auth = auth;
                    return true;
                },
            })
            .compile();
        app = moduleRef.createNestApplication();
        app.useGlobalPipes(new ValidationPipe(validationPipeOptions));
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    beforeEach(() => {
        vi.clearAllMocks();
        service.post.mockResolvedValue({ operationSightingId: SIGHTING_ID });
        service.invalidate.mockResolvedValue({});
        service.restore.mockResolvedValue({});
    });

    it('匿名（役割なし）の投稿は 403', async () => {
        auth = { userId: 'anon-1', role: null };
        const res = await request(app.getHttpServer()).post('/').send(body);
        expect(res.status).toBe(403);
        expect(service.post).not.toHaveBeenCalled();
    });

    it('reporter の投稿は通り、JWT の sub を投稿者として渡す', async () => {
        auth = { userId: 'user-1', role: Role.REPORTER };
        const res = await request(app.getHttpServer()).post('/').send(body);
        expect(res.status).toBe(201);
        expect(service.post).toHaveBeenCalledWith(
            expect.objectContaining({ userId: 'user-1' }),
        );
    });

    it('無効化は body の userId を捨て、JWT の sub を使う', async () => {
        auth = { userId: 'editor-1', role: Role.EDITOR };
        const res = await request(app.getHttpServer())
            .patch(`/${SIGHTING_ID}/invalidate`)
            .send({ userId: 'someone-else', reason: 'test' });
        expect(res.status).toBe(200);
        expect(service.invalidate).toHaveBeenCalledWith({
            operationSightingId: SIGHTING_ID,
            userId: 'editor-1',
            reason: 'test',
        });
    });

    it('復元も JWT の sub を使う', async () => {
        auth = { userId: 'editor-1', role: Role.MANAGER };
        const res = await request(app.getHttpServer())
            .patch(`/${SIGHTING_ID}/restore`)
            .send({ reason: 'test' });
        expect(res.status).toBe(200);
        expect(service.restore).toHaveBeenCalledWith({
            operationSightingId: SIGHTING_ID,
            userId: 'editor-1',
            reason: 'test',
        });
    });
});
```

controller のルートの前置き（`@Controller(...)` のパス）と `PostOperationSightingDto` の必須項目は実物に合わせる。ルートが `/` 以外なら `request(...).post('<実際のパス>')` に直す。

- [ ] **Step 8: 落ちることを確かめる**

Run: `npx vitest run src/libs/operation-sighting/presentation`
Expected: FAIL（匿名の投稿が 201 になる・無効化に `someone-else` が渡る）

- [ ] **Step 9: controller を直す**

```ts
    @Post()
    @RBAC(Role.REPORTER, Role.EDITOR, Role.MANAGER)
    async post(
        @Req() req: Request,
        @Body() body: PostOperationSightingDto,
    ): Promise<OperationSightingDetailsDto> {
        // @RBAC を通った時点で req.auth.userId はある
        const userId = req.auth!.userId!;
        return this.operationSightingV3Service.post({ ...body, userId });
    }

    @Patch('/:id/invalidate')
    @RBAC(Role.EDITOR, Role.MANAGER)
    async invalidate(
        @Req() req: Request,
        @Param('id') id: string,
        @Body() body: InvalidateOperationSightingDto,
    ): Promise<OperationSightingDetailsDto> {
        return this.operationSightingV3Service.invalidate({
            operationSightingId: id,
            userId: req.auth!.userId!,
            reason: body.reason,
        });
    }
```

`restore` も同じ形。`Req` は `@nestjs/common`、`Request` は `express` から import する。

- [ ] **Step 10: 通ることを確かめる**

Run: `npx vitest run src/libs/operation-sighting`
Expected: PASS

- [ ] **Step 11: コミット**

```bash
git add src/libs/operation-sighting
git commit -m "feat: :lock: 目撃の投稿を登録者だけにし投稿者を記録する"
```

---

### Task 4: trip-blocks の書き込み

**Files:**
- Modify: `src/libs/trip-block/presentation/trip-block.v3.controller.ts`
- Modify: `src/libs/trip-block/usecase/trip-block.v3.service.ts`
- Modify: `src/libs/trip-block/trip-block.v3.module.ts`（`SocketSignalModule` を imports に）
- Test: `src/libs/trip-block/usecase/trip-block.v3.service.spec.ts`
- Test: `src/libs/trip-block/presentation/trip-block.v3.controller.spec.ts`（新規）

**Interfaces:**
- Consumes: `SocketSignal.send({ type: 'timetable' })`（Task 2）

- [ ] **Step 1: controller のテストを書く（失敗する）**

Task 3 の Step 7 と同じ組み立て（`AuthGuard` を `auth` を差し込む偽物にし、`RBACGuard` は本物のまま）で、`TripBlockV3Service` を `{ createManyTripBlocks, replaceOneTripBlock, addTripToTripBlock, deleteTripFromTripBlock }` の mock にする。次を確かめる:

```ts
    it.each([
        ['POST', '/bulk'],
        ['PUT', `/${ID}`],
        ['PATCH', `/${ID}/add-trip`],
        ['PATCH', `/${ID}/delete-trip`],
    ])('reporter の %s %s は 403', async (method, path) => {
        auth = { userId: 'user-1', role: Role.REPORTER };
        const res = await request(app.getHttpServer())
            [method.toLowerCase() as 'post' | 'put' | 'patch'](path)
            .send({});
        expect(res.status).toBe(403);
    });

    it('匿名の POST /bulk は 403', async () => {
        auth = { userId: 'anon-1', role: null };
        const res = await request(app.getHttpServer()).post('/bulk').send([]);
        expect(res.status).toBe(403);
    });

    it('editor の POST /bulk は役割で弾かれない', async () => {
        auth = { userId: 'editor-1', role: Role.EDITOR };
        const res = await request(app.getHttpServer()).post('/bulk').send([]);
        expect(res.status).not.toBe(403);
    });
```

（`ID` は任意の UUID。403 は入力検証より前に出るので、body は空でよい）

- [ ] **Step 2: 落ちることを確かめる**

Run: `npx vitest run src/libs/trip-block/presentation`
Expected: FAIL（reporter・匿名が 403 にならない）

- [ ] **Step 3: controller に役割を付ける**

`@Post('/bulk')`・`@Put('/:id')`・`@Patch('/:id/add-trip')`・`@Patch('/:id/delete-trip')` のそれぞれに `@RBAC(Role.EDITOR, Role.MANAGER)` を足す（`RBAC`・`Role` は `src/core/modules/rbac/` から）。

- [ ] **Step 4: service のテストを足す（失敗する）**

`trip-block.v3.service.spec.ts` の providers に `{ provide: SocketSignal, useValue: { send: mockSignalSend } }` を足し、4 つの書き込みの成功ケースそれぞれで `expect(mockSignalSend).toHaveBeenCalledWith({ type: 'timetable' })`、失敗ケース（既存の検証エラーのテスト）で `expect(mockSignalSend).not.toHaveBeenCalled()` を確かめる。

- [ ] **Step 5: service に合図を足す**

constructor に `private readonly socketSignal: SocketSignal` を足し、`createManyTripBlocks`・`replaceOneTripBlock`・`addTripToTripBlock`・`deleteTripFromTripBlock` のそれぞれで、結果を返す直前（保存が成功した後）に `await this.socketSignal.send({ type: 'timetable' });` を置く。`trip-block.v3.module.ts` の imports に `SocketSignalModule` を足す。CLI（`trip-block.cli.service.ts`）は `TripBlockV3Service` を使っていないので触らない（使っていたら止めて報告）。

- [ ] **Step 6: 通ることを確かめる**

Run: `npx vitest run src/libs/trip-block`
Expected: PASS

- [ ] **Step 7: コミット**

```bash
git add src/libs/trip-block
git commit -m "fix: :lock: 時刻表の書き込みを編集者だけにし保存を socket に知らせる"
```

---

### Task 5: 全体の確認と ADR

**Files:**
- Create: `docs/adr/<次の番号>-registered-only-posting.md`

- [ ] **Step 1: 全テスト・lint・ビルド（サンドボックスの外）**

Run: `npm test`、`npm run lint`、`npm run build`
Expected: どれも成功

- [ ] **Step 2: ADR を書く**

`docs/adr/` の既存の書式にならい、次を記録する: 投稿者をサブテーブルに分けたこと、合図を api からの Lambda Invoke（d′）にしたこと、却下した案（列を足す・socket で絞る b＋c＋e）、`management_logs.user_id` の FK。

- [ ] **Step 3: コミット**

```bash
git add docs/adr
git commit -m "docs: :memo: 登録制の投稿と socket への合図の ADR を追加する"
```

- [ ] **Step 4: デプロイの前提を確かめる（デプロイはユーザーの指示を待つ）**

socket の broadcast 関数がデプロイ済みであること（`aws-vault exec administrator -- aws lambda get-function --function-name sotetsu-lab-v3-prod-socket-broadcast-lambda`）と、Task 1 の migration が本番に流れていることを確かめてから、PR とデプロイに進む。

- [ ] **Step 5: 本番での確認（デプロイ後）**

- ゲスト（匿名）のトークンで `POST /v3/operation-sightings` が 403
- 登録者で投稿すると `operation_sighting_authors` に行ができ、別の端末の real-time が更新される
- 編集者で trip-blocks を保存すると、別の端末の時刻表のキャッシュが捨てられる
- CloudWatch の api のログに「socket への合図に失敗しました」が出ていない
