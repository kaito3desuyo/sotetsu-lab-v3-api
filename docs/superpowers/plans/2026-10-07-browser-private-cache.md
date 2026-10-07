# v3 GET のブラウザ private キャッシュ（API 側）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** クライアントが使う v3 の GET 28 本に、成功したときだけ `Cache-Control` を付ける。あわせて CloudFront の TTL を 0 にして、1 秒の認証の素通りを塞ぐ。

**Architecture:** `@CacheControl(value)` デコレーターでメタデータを付ける。グローバルの `CacheControlInterceptor` が、handler が値を流したときだけヘッダーを書く。値は `CACHE_CONTROL` 定数の 3 種類だけを使う。

**Tech Stack:** NestJS 10 / Express / Jest + supertest / Serverless Framework（`serverless.ts`）

**Spec:** `docs/superpowers/specs/2026-10-07-browser-private-cache-design.md`

## Global Constraints

- 値は次の 3 つだけ: `'private, max-age=3600'`（A・B マスタ）、`'private, max-age=600'`（C 時刻表）、`'no-store'`（D リアルタイム）。
- Nest の `@Header()` は使わない（handler の前に付くので、エラーの返答にも残る）。
- `GET /v3/trips/station/:stationId` と `GET /v3/operation-sightings/time-cross-section/formation-number/:formationNumber` には付けない。
- POST / PUT / PATCH には付けない。
- `serverless.ts` は `MinTTL: 0` / `DefaultTTL: 0`。`MaxTTL` はそのまま。
- 出す順: クライアントの同名 spec を先にデプロイし、この API はその後に出す。
- テストは `npx jest <パス>` で、出力は `.context/` にリダイレクトして tail を読む。
- コミットは Conventional Commits + 絵文字（例 `feat: :sparkles: …`）、署名つき。ドメイン名は日本語で書く。

## Review Focus

1. handler が例外を投げた返答（404 / 500 / UseCaseError → 4xx）に Cache-Control が付かないこと → Task 2 で、`NotFoundException` に加えて素の `Error` を投げた場合も確かめる。
2. 同期で配列を返す handler（`OperationV3Controller.findAllGroups`）にも付くこと → Task 3 の表に入れ、Task 2 では同期で返す handler のケースを確かめる。
3. 表に無い GET や POST に、うっかり付いていないこと → Task 3 の網羅 spec で、対象外の 2 本と、POST を持つコントローラーの書き込み handler にメタデータが無いことを確かめる。
4. CloudFront の TTL を 0 にしたせいで、gzip の圧縮が止まったりキャッシュキーの設定が拒まれたりしないこと → Task 4 で `MaxTTL` を残し、`EnableAcceptEncodingGzip` などは触らない。デプロイ後に `curl -I` で確かめる。
5. `res.setHeader` が、返答を送った後に呼ばれて例外にならないこと → interceptor は `tap` の next で書くので、Nest が返答を送る前に書かれる。Task 2 の supertest で、ヘッダーが実際に届くことで確かめる。

---

### Task 1: ADR

**Files:**
- Create: `docs/adr/0004-browser-private-cache.md`

- [ ] **Step 1: ADR を書く**

`docs/adr/0003-bulk-time-cross-sections-and-current-positions.md` と同じ見出しで書く。中身は次の 3 点。

- 背景: CloudFront の共有キャッシュは認証を素通りするので却下した。MinTTL 1 の穴があった。
- 決定: v3 GET に private の Cache-Control を付ける。成功時だけ interceptor で付ける。CloudFront の TTL は 0 にする。
- 結果: 書いた本人の鮮度はクライアント側で担保する（クライアントの spec を参照）。

- [ ] **Step 2: コミット（docs だけであることを確かめてから）**

```bash
git add docs/adr/0004-browser-private-cache.md
git diff --cached --stat
git commit -S -m "docs: :memo: v3 GET のブラウザ private キャッシュの ADR を追加する"
```

---

### Task 2: `CACHE_CONTROL` 定数・`@CacheControl` デコレーター・`CacheControlInterceptor`

**Files:**
- Create: `src/core/configs/cache-control.ts`
- Create: `src/core/configs/cache-control.spec.ts`
- Modify: `src/app.ts`

**Interfaces:**
- Produces:
  - `CACHE_CONTROL: { MASTER: 'private, max-age=3600'; TIMETABLE: 'private, max-age=600'; REALTIME: 'no-store' }`
  - `CACHE_CONTROL_METADATA_KEY = 'cache-control'`
  - `CacheControl(value: string): MethodDecorator`
  - `class CacheControlInterceptor implements NestInterceptor { constructor(reflector: Reflector) }`

- [ ] **Step 1: 失敗するテストを書く**

`src/core/configs/cache-control.spec.ts`:

```ts
import {
    Controller,
    Get,
    INestApplication,
    NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import {
    CACHE_CONTROL,
    CacheControl,
    CacheControlInterceptor,
} from './cache-control';

@Controller()
class DummyController {
    @Get('master')
    @CacheControl(CACHE_CONTROL.MASTER)
    master(): string[] {
        return ['ok'];
    }

    @Get('async')
    @CacheControl(CACHE_CONTROL.TIMETABLE)
    async asyncOk(): Promise<string[]> {
        return ['ok'];
    }

    @Get('not-found')
    @CacheControl(CACHE_CONTROL.MASTER)
    notFound(): string[] {
        throw new NotFoundException();
    }

    @Get('broken')
    @CacheControl(CACHE_CONTROL.MASTER)
    async broken(): Promise<string[]> {
        throw new Error('boom');
    }

    @Get('plain')
    plain(): string[] {
        return ['ok'];
    }
}

describe('CacheControlInterceptor', () => {
    let app: INestApplication;

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            controllers: [DummyController],
        }).compile();
        app = moduleRef.createNestApplication();
        app.useGlobalInterceptors(new CacheControlInterceptor(new Reflector()));
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    it('同期で返す handler の成功した返答に、指定の Cache-Control を付ける', async () => {
        const res = await request(app.getHttpServer()).get('/master');

        expect(res.status).toBe(200);
        expect(res.headers['cache-control']).toBe('private, max-age=3600');
    });

    it('Promise を返す handler の成功した返答にも付ける', async () => {
        const res = await request(app.getHttpServer()).get('/async');

        expect(res.status).toBe(200);
        expect(res.headers['cache-control']).toBe('private, max-age=600');
    });

    it('handler が NotFoundException を投げたら付けない', async () => {
        const res = await request(app.getHttpServer()).get('/not-found');

        expect(res.status).toBe(404);
        expect(res.headers['cache-control']).toBeUndefined();
    });

    it('handler が素の Error を投げた 500 にも付けない', async () => {
        const res = await request(app.getHttpServer()).get('/broken');

        expect(res.status).toBe(500);
        expect(res.headers['cache-control']).toBeUndefined();
    });

    it('@CacheControl の無い handler には付けない', async () => {
        const res = await request(app.getHttpServer()).get('/plain');

        expect(res.status).toBe(200);
        expect(res.headers['cache-control']).toBeUndefined();
    });

    it('値は 3 種類だけ', () => {
        expect(CACHE_CONTROL).toEqual({
            MASTER: 'private, max-age=3600',
            TIMETABLE: 'private, max-age=600',
            REALTIME: 'no-store',
        });
    });
});
```

- [ ] **Step 2: 失敗を確かめる**

Run: `npx jest src/core/configs/cache-control.spec.ts > .context/jest-cache-control.txt 2>&1; tail -30 .context/jest-cache-control.txt`
Expected: FAIL（`Cannot find module './cache-control'`）

- [ ] **Step 3: 実装する**

`src/core/configs/cache-control.ts`:

```ts
import {
    CallHandler,
    ExecutionContext,
    Injectable,
    NestInterceptor,
    SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Response } from 'express';
import { Observable, tap } from 'rxjs';

/**
 * v3 GET の Cache-Control。どれも private なので CloudFront には置かれず、利用者のブラウザだけが覚える
 * （CloudFront の共有キャッシュは認証を素通りするため不採用。2026-10-07）。
 * TIMETABLE の 600 秒は、クライアントが書き込み後に `cache: 'reload'` で取る窓の長さと同じでなければならない
 * （sotetsu-lab-v3-client の docs/superpowers/specs/2026-10-07-browser-private-cache-design.md）。
 */
export const CACHE_CONTROL = {
    MASTER: 'private, max-age=3600',
    TIMETABLE: 'private, max-age=600',
    REALTIME: 'no-store',
} as const;

export const CACHE_CONTROL_METADATA_KEY = 'cache-control';

/**
 * 成功した返答にだけ Cache-Control を付ける。
 * Nest の `@Header()` は handler の前に付くため、例外の返答にも残ってブラウザが失敗を覚えてしまう。
 */
export const CacheControl = (value: string): MethodDecorator =>
    SetMetadata(CACHE_CONTROL_METADATA_KEY, value);

@Injectable()
export class CacheControlInterceptor implements NestInterceptor {
    constructor(private readonly reflector: Reflector) {}

    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        const value = this.reflector.get<string | undefined>(
            CACHE_CONTROL_METADATA_KEY,
            context.getHandler(),
        );

        if (!value) {
            return next.handle();
        }

        return next.handle().pipe(
            tap(() => {
                context
                    .switchToHttp()
                    .getResponse<Response>()
                    .setHeader('Cache-Control', value);
            }),
        );
    }
}
```

`src/app.ts` の import と `createApp` に足す（`Reflector` は `@nestjs/core` から）:

```ts
import { NestFactory, Reflector } from '@nestjs/core';
// …
import { CacheControlInterceptor } from './core/configs/cache-control';
// …
    app.useGlobalPipes(new ValidationPipe(validationPipeOptions));
    app.useGlobalInterceptors(new CacheControlInterceptor(app.get(Reflector)));
```

- [ ] **Step 4: 通ることを確かめる**

Run: `npx jest src/core/configs/cache-control.spec.ts > .context/jest-cache-control.txt 2>&1; tail -30 .context/jest-cache-control.txt`
Expected: PASS 6/6

- [ ] **Step 5: 型を確かめる**

Run: `npx tsc --noEmit -p tsconfig.json > .context/tsc-cache-control.txt 2>&1; tail -20 .context/tsc-cache-control.txt`
Expected: エラーなし

- [ ] **Step 6: コミット**

```bash
git add src/core/configs/cache-control.ts src/core/configs/cache-control.spec.ts src/app.ts
git commit -S -m "feat: :sparkles: 成功した返答にだけ Cache-Control を付ける interceptor を追加する"
```

---

### Task 3: v3 の GET 28 本に `@CacheControl` を付ける

**Files:**
- Modify:
  - `src/libs/agency/presentation/agency.v3.controller.ts`
  - `src/libs/calendar/presentation/calendar.v3.controller.ts`
  - `src/libs/calendar/presentation/calendar-date.v3.controller.ts`
  - `src/libs/formation/presentation/formation.v3.controller.ts`
  - `src/libs/operation/presentation/operation.v3.controller.ts`
  - `src/libs/operation-sighting/presentation/operation-sighting.v3.controller.ts`
  - `src/libs/route/presentation/route.v3.controller.ts`
  - `src/libs/service/presentation/service.v3.controller.ts`
  - `src/libs/station/presentation/station.v3.controller.ts`
  - `src/libs/trip-block/presentation/trip-block.v3.controller.ts`
  - `src/libs/trip-class/presentation/trip-class.v3.controller.ts`
- Create: `src/core/configs/cache-control.routes.spec.ts`

**Interfaces:**
- Consumes: `CACHE_CONTROL`、`CACHE_CONTROL_METADATA_KEY`、`CacheControl` from `src/core/configs/cache-control`（Task 2）

- [ ] **Step 1: 失敗する網羅テストを書く**

`src/core/configs/cache-control.routes.spec.ts`:

```ts
import { Reflector } from '@nestjs/core';
import { AgencyV3Controller } from 'src/libs/agency/presentation/agency.v3.controller';
import { CalendarDateV3Controller } from 'src/libs/calendar/presentation/calendar-date.v3.controller';
import { CalendarV3Controller } from 'src/libs/calendar/presentation/calendar.v3.controller';
import { FormationV3Controller } from 'src/libs/formation/presentation/formation.v3.controller';
import { OperationSightingV3Controller } from 'src/libs/operation-sighting/presentation/operation-sighting.v3.controller';
import { OperationV3Controller } from 'src/libs/operation/presentation/operation.v3.controller';
import { RouteV3Controller } from 'src/libs/route/presentation/route.v3.controller';
import { ServiceV3Controller } from 'src/libs/service/presentation/service.v3.controller';
import { StationV3Controller } from 'src/libs/station/presentation/station.v3.controller';
import { TripBlockV3Controller } from 'src/libs/trip-block/presentation/trip-block.v3.controller';
import { TripClassV3Controller } from 'src/libs/trip-class/presentation/trip-class.v3.controller';
import { TripV3Controller } from 'src/libs/trip/presentation/trip.v3.controller';
import { CACHE_CONTROL, CACHE_CONTROL_METADATA_KEY } from './cache-control';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyController = { prototype: any; name: string };

const { MASTER, TIMETABLE, REALTIME } = CACHE_CONTROL;

/** spec の表そのもの（docs/superpowers/specs/2026-10-07-browser-private-cache-design.md） */
const TABLE: [AnyController, string, string][] = [
    // A マスタ
    [AgencyV3Controller, 'findAll', MASTER],
    [RouteV3Controller, 'findMany', MASTER],
    [RouteV3Controller, 'findOneWithStations', MASTER],
    [ServiceV3Controller, 'findMany', MASTER],
    [ServiceV3Controller, 'findOneStations', MASTER],
    [ServiceV3Controller, 'findOneServiceWithAgencies', MASTER],
    [ServiceV3Controller, 'findOneServiceWithRoutes', MASTER],
    [StationV3Controller, 'findAll', MASTER],
    [TripClassV3Controller, 'findMany', MASTER],
    [OperationV3Controller, 'findAllGroups', MASTER],
    [CalendarV3Controller, 'findMany', MASTER],
    [CalendarV3Controller, 'findOne', MASTER],
    // B 日付つきマスタ
    [CalendarV3Controller, 'findOneBySpecificDate', MASTER],
    [CalendarDateV3Controller, 'findMany', MASTER],
    [FormationV3Controller, 'findManyBySpecificDate', MASTER],
    [FormationV3Controller, 'findManyBySpecificPeriod', MASTER],
    // C 時刻表
    [TripBlockV3Controller, 'findManyByFilter', TIMETABLE],
    [TripBlockV3Controller, 'findOneById', TIMETABLE],
    [OperationV3Controller, 'findManyByCalendarId', TIMETABLE],
    [OperationV3Controller, 'findManyWithTrips', TIMETABLE],
    [OperationV3Controller, 'findOneWithTrips', TIMETABLE],
    [OperationV3Controller, 'findManyBySpecificPeriod', TIMETABLE],
    // D リアルタイム
    [OperationSightingV3Controller, 'findManyBySpecificPeriod', REALTIME],
    [OperationSightingV3Controller, 'findManyTimeCrossSectionsByOperationNumbers', REALTIME],
    [OperationSightingV3Controller, 'findManyTimeCrossSectionsByFormationNumbers', REALTIME],
    [OperationSightingV3Controller, 'findOneTimeCrossSectionByOperationNumber', REALTIME],
    [OperationV3Controller, 'findManyWithCurrentPosition', REALTIME],
    [OperationV3Controller, 'findOneWithCurrentPosition', REALTIME],
];

const reflector = new Reflector();
const read = (controller: AnyController, method: string) =>
    reflector.get<string | undefined>(
        CACHE_CONTROL_METADATA_KEY,
        controller.prototype[method],
    );

describe('v3 GET の Cache-Control', () => {
    it('表は 28 本', () => {
        expect(TABLE).toHaveLength(28);
    });

    it.each(TABLE.map(([c, m, v]) => [`${c.name}.${m}`, c, m, v] as const))(
        '%s',
        (_label, controller, method, value) => {
            expect(controller.prototype[method]).toBeInstanceOf(Function);
            expect(read(controller, method)).toBe(value);
        },
    );

    it('クライアントが使っていない 2 本には付けない', () => {
        expect(read(TripV3Controller, 'findManyByStationId')).toBeUndefined();
        expect(
            read(
                OperationSightingV3Controller,
                'findOneTimeCrossSectionByFormationNumber',
            ),
        ).toBeUndefined();
    });

    it('表に無い handler（書き込みを含む）には付けない', () => {
        const listed = new Set(TABLE.map(([c, m]) => `${c.name}.${m}`));
        const controllers = [...new Set(TABLE.map(([c]) => c))];
        const stray = controllers.flatMap((c) =>
            Object.getOwnPropertyNames(c.prototype)
                .filter((m) => m !== 'constructor')
                .filter((m) => !listed.has(`${c.name}.${m}`))
                .filter((m) => read(c, m) !== undefined)
                .map((m) => `${c.name}.${m}`),
        );
        expect(stray).toEqual([]);
    });
});
```

- [ ] **Step 2: 失敗を確かめる**

Run: `npx jest src/core/configs/cache-control.routes.spec.ts > .context/jest-cache-control-routes.txt 2>&1; tail -40 .context/jest-cache-control-routes.txt`
Expected: FAIL（表の 28 件が `Expected: "private, max-age=3600" Received: undefined` などで落ちる。「表は 28 本」「付けない」系は PASS）

- [ ] **Step 3: 各コントローラーに付ける**

各ファイルに次の import を足す:

```ts
import { CACHE_CONTROL, CacheControl } from 'src/core/configs/cache-control';
```

そのうえで、表の各 handler の `@Get(...)` の直下に 1 行足す。例（`operation.v3.controller.ts`）:

```ts
    @Get('/groups')
    @CacheControl(CACHE_CONTROL.MASTER)
    findAllGroups(): OperationGroupDto[] {
```

```ts
    @Get('/calendar/:calendarId')
    @CacheControl(CACHE_CONTROL.TIMETABLE)
    async findManyByCalendarId(
```

```ts
    @Get('/current-positions')
    @CacheControl(CACHE_CONTROL.REALTIME)
    async findManyWithCurrentPosition(
```

付ける handler と値の対応は、Step 1 の `TABLE` と完全に同じにする（ほかの handler には付けない）:

| ファイル | handler → 値 |
|---|---|
| agency.v3.controller.ts | `findAll` → MASTER |
| route.v3.controller.ts | `findMany` → MASTER、`findOneWithStations` → MASTER |
| service.v3.controller.ts | `findMany`、`findOneStations`、`findOneServiceWithAgencies`、`findOneServiceWithRoutes` → MASTER |
| station.v3.controller.ts | `findAll` → MASTER |
| trip-class.v3.controller.ts | `findMany` → MASTER |
| calendar.v3.controller.ts | `findMany`、`findOneBySpecificDate`、`findOne` → MASTER |
| calendar-date.v3.controller.ts | `findMany` → MASTER |
| formation.v3.controller.ts | `findManyBySpecificDate`、`findManyBySpecificPeriod` → MASTER |
| trip-block.v3.controller.ts | `findManyByFilter`、`findOneById` → TIMETABLE |
| operation.v3.controller.ts | `findAllGroups` → MASTER。`findManyByCalendarId`、`findManyWithTrips`、`findOneWithTrips`、`findManyBySpecificPeriod` → TIMETABLE。`findManyWithCurrentPosition`、`findOneWithCurrentPosition` → REALTIME |
| operation-sighting.v3.controller.ts | `findManyBySpecificPeriod`、`findManyTimeCrossSectionsByOperationNumbers`、`findManyTimeCrossSectionsByFormationNumbers`、`findOneTimeCrossSectionByOperationNumber` → REALTIME（`findOneTimeCrossSectionByFormationNumber` には付けない） |

`trip.v3.controller.ts` は触らない。

- [ ] **Step 4: 通ることを確かめる**

Run: `npx jest src/core/configs/cache-control.routes.spec.ts > .context/jest-cache-control-routes.txt 2>&1; tail -40 .context/jest-cache-control-routes.txt`
Expected: PASS 31/31（28 + 3）

- [ ] **Step 5: 全テストと型**

Run: `npx jest > .context/jest-all.txt 2>&1; tail -15 .context/jest-all.txt`
Expected: `Tests:` 行に failed が無い

Run: `npx tsc --noEmit -p tsconfig.json > .context/tsc-all.txt 2>&1; tail -20 .context/tsc-all.txt`
Expected: エラーなし

- [ ] **Step 6: 整形（ファイル単位）**

Run: `npx prettier --write src/core/configs/cache-control.ts src/core/configs/cache-control.spec.ts src/core/configs/cache-control.routes.spec.ts src/app.ts src/libs/agency/presentation/agency.v3.controller.ts src/libs/calendar/presentation/calendar.v3.controller.ts src/libs/calendar/presentation/calendar-date.v3.controller.ts src/libs/formation/presentation/formation.v3.controller.ts src/libs/operation/presentation/operation.v3.controller.ts src/libs/operation-sighting/presentation/operation-sighting.v3.controller.ts src/libs/route/presentation/route.v3.controller.ts src/libs/service/presentation/service.v3.controller.ts src/libs/station/presentation/station.v3.controller.ts src/libs/trip-block/presentation/trip-block.v3.controller.ts src/libs/trip-class/presentation/trip-class.v3.controller.ts`
Expected: 対象のファイルだけが整形される（`git diff --stat` で、関係ないファイルが混ざっていないことを見る）

- [ ] **Step 7: コミット**

```bash
git add src/core/configs src/app.ts src/libs/*/presentation/*.v3.controller.ts
git commit -S -m "feat: :sparkles: v3 の GET 28 本に Cache-Control を付ける"
```

---

### Task 4: CloudFront のキャッシュポリシーの TTL を 0 にする

**Files:**
- Modify: `serverless.ts:247-249`

- [ ] **Step 1: TTL を書き換える**

```ts
                    CachePolicyConfig: {
                        Name: 'Sotetsu_Lab_v3_API_CloudFront_Cache_Policy',
                        // MinTTL が 0 より大きいと、private / no-store の返答でも CloudFront が
                        // その秒数キャッシュし、認証を通らずに返してしまう（2026-10-07）。
                        DefaultTTL: 0,
                        MaxTTL: 31536000,
                        MinTTL: 0,
```

ほかの項目（`ParametersInCacheKeyAndForwardedToOrigin`、`EnableAcceptEncodingGzip` など）は触らない。

- [ ] **Step 2: 型と package を確かめる**

Run: `npx tsc --noEmit -p tsconfig.json > .context/tsc-serverless.txt 2>&1; tail -20 .context/tsc-serverless.txt`
Expected: エラーなし

Run: `npx serverless package --stage prod > .context/sls-package.txt 2>&1; tail -20 .context/sls-package.txt`
Expected: package が成功する。認証情報が無くて失敗したら、このステップは飛ばして ledger に書く。デプロイはしない。

- [ ] **Step 3: コミット**

```bash
git add serverless.ts
git commit -S -m "fix: :lock: CloudFront の最小 TTL を 0 にして private な返答を置かないようにする"
```

---

## デプロイ後の確認（ユーザーがデプロイした後に行う。タスクではない）

- `curl -sI -H 'x-sotetsu-lab-authorization: …' https://api.sotetsu-lab.com/v3/stations` は、ユーザーに頼んで実行してもらう（トークンは探さない）。
  - `cache-control: private, max-age=3600` が付いていること。
  - 2 回続けて叩いても `x-cache: Miss from cloudfront` のままであること。
- 1 日後に、Lambda の Invocations と pg_stat_statements の trip-blocks の calls を、spec の「効果の測り方」に従って比べる。
