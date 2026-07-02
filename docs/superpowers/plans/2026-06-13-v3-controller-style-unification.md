# v3 コントローラー記法統一 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** v3 エンドポイント群の記法を、ユーザーが決定した 7 軸（A〜G）に統一する。挙動・レスポンス形式・DB スキーマは一切変更しない純粋なスタイル統一リファクタである。

**Architecture:** NestJS 10 + TypeScript 4.7 のクリーンアーキテクチャ。変更対象は `src/libs/<domain>/presentation/*.v3.controller.ts`（記法）と一部 `usecase/*.v3.service.ts`（シグネチャ）、および新規の DTO / Query クラス。infrastructure・domain・entity・migration・v2 コードには触れない。

**Tech Stack:** NestJS, TypeScript, class-validator, class-transformer, TypeORM, Jest。`tsconfig.json` に `strict` 指定なし（strictNullChecks 無効）。`ValidationPipe` はグローバル適用済みで `transform: true` / `errorHttpStatusCode: 422 (UNPROCESSABLE_ENTITY)`（`src/core/configs/validator-options.ts`）。

---

## 統一方針（7 軸の確定定義）

実装者は各タスクに入る前にこの定義を必ず読むこと。

| 軸 | 名称 | 確定ルール |
|---|---|---|
| **A** | async つき | v3 コントローラーの全ハンドラメソッドに `async` を付ける |
| **B** | 冗長型 | ハンドラ本体は必ず `const result = await this.xxxService.method(...);` → 空行 → `return result;` の形にする。直 return は禁止 |
| **C** | DTO/service 任せ | コントローラー内の手動 `UnprocessableEntityException` バリデーションを撤去し、検証は class-validator DTO（=軸D）に委ねる |
| **D** | 専用 Param/Query クラス | パラメータ束縛は専用の class-validator クラスで行う。複数クエリ／型変換が要る箇所は `@Query() q: XxxQuery`、既に専用 Param クラスがある書込系は `@Param() p: XxxParam`。単一かつ自明な path セグメント（`:id`・`:date` 等）は formation 参照実装に倣い `@Param('key') key: string` のインライン束縛を維持する |
| **E** | オブジェクト引数 | service の書込メソッドへは位置引数でなく単一オブジェクト `{ id, dto }` で渡す（operation-sighting v3 の `{ ... }` 流儀に合わせる） |
| **F** | 先頭スラッシュあり | ルートパス文字列は必ず先頭スラッシュ付き。`@Get()` → `@Get('/')`、`@Get(':id')` → `@Get('/:id')` |
| **G** | DTO を作成する | `operation.findOneWithTrips` の `{ operation: any; trips: any[] }` を専用 DTO `OperationWithTripsDto` に置換し `any` を排除する |

### 対象外（明示）

- **軸 H（import 順）はユーザー指定外のため対象外**。既存 import 行の並べ替えは行わない。新規 import 追加時のみ、既存の並び（概ねアルファベット順）に沿った位置へ挿入する。
- **`operation-sighting.v3.controller.ts` は変更しない**。既に A/B/E を満たす v3 コマンド系の参照実装であり、touch しない。
- **v2 コード全般は不変**（`*.v2.controller.ts` / `*.v2.service.ts`）。`ReplaceTripBlockParam` 等の Param クラスは v2 と共有のため**削除・改変しない**（v3 から参照するのみ）。
- **vehicle に v3 は存在しない**（仕様表外）。新設しない。
- infrastructure（`*.query.ts` / `*.command.ts`）は軸 G の型注釈変更を除き不変。domain・entity・migration は不変。

### 挙動の同一性に関する注意（実装者は理解した上で進めること）

- 軸 F の `@Get()`→`@Get('/')`、`@Get(':id')`→`@Get('/:id')` は NestJS のルーティング上**完全に等価**で、URL は変わらない。
- 軸 G の DTO はコントローラー戻り値の**型注釈のみ**を変える。実レスポンスは `operation.query.ts` 内の `buildOperationDetailsDto` で生成済みで、`ClassSerializerInterceptor` は未使用のため**ランタイム出力は不変**。
- 軸 C+D で `trip` / `trip-block` のフィルタ検証を DTO 化すると、**HTTP ステータスは 422 のまま**（`ValidationPipe` の `errorHttpStatusCode` が 422）。ただしエラーメッセージ文言は手書き文字列から class-validator 既定文言に変わる。さらに従来「`Number(値)` で NaN になっても素通り」だった不正 `tripDirection` は `@IsInt()` で 422 になる（より正しい挙動）。これは軸 C「DTO/service 任せ」の意図どおりであり許容する。

---

## ファイル構成（新規・変更一覧）

**新規作成（3 ファイル + 2 テスト）:**
- `src/libs/operation/usecase/dtos/operation-with-trips.dto.ts`（軸G）
- `src/libs/trip/usecase/params/trip-find-many-by-station-id.query.ts`（軸D）
- `src/libs/trip/usecase/params/trip-find-many-by-station-id.query.spec.ts`
- `src/libs/trip-block/usecase/params/trip-block-find-many-by-filter.query.ts`（軸D）
- `src/libs/trip-block/usecase/params/trip-block-find-many-by-filter.query.spec.ts`

**変更（コントローラー）:**
- `agency.v3.controller.ts`（A・B・F）
- `station.v3.controller.ts`（A・B・F）
- `calendar.v3.controller.ts`（B・F）
- `route.v3.controller.ts`（A・B・F）
- `service.v3.controller.ts`（A・B・F）
- `formation.v3.controller.ts`（B）
- `operation.v3.controller.ts`（B・G）
- `trip.v3.controller.ts`（B・C・D）
- `trip-block.v3.controller.ts`（B・C・D・E）

**変更（service / query：軸 E・G）:**
- `trip-block/usecase/trip-block.v3.service.ts`（E：書込3メソッドのシグネチャ）
- `operation/usecase/operation.v3.service.ts`（G：`findOneWithTrips` 戻り型）
- `operation/infrastructure/queries/operation.query.ts`（G：`findOneWithTrips` 戻り型のみ）

**変更なし（明示）:** `operation-sighting.v3.controller.ts`、全 v2、vehicle。

---

## Task 0: 作業ブランチを作成する

**Files:** なし（git 操作のみ）

- [ ] **Step 1: master から作業ブランチを生やし空コミットを置く**

Run:
```bash
git switch -c refactor/v3-controller-style-unification
git commit --allow-empty -m "first commit"
```
Expected: 新ブランチに切り替わり、空コミットが作成される。

> 注: master/main 上では絶対にコミットしないこと。以降の各コミットはこのブランチ上で行う。

---

## Task 1: agency v3 コントローラー（軸 A・B・F）

**Files:**
- Modify: `src/libs/agency/presentation/agency.v3.controller.ts`

- [ ] **Step 1: ファイル全体を以下に置換する**

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/core/modules/auth/auth.guard';
import { RBACGuard } from 'src/core/modules/rbac/rbac.guard';
import { AgencyDetailsDto } from '../usecase/dtos/agency-details.dto';
import { AgencyV3Service } from '../usecase/agency.v3.service';

@Controller()
@UseGuards(AuthGuard, RBACGuard)
export class AgencyV3Controller {
    constructor(private readonly agencyV3Service: AgencyV3Service) {}

    @Get('/')
    async findAll(): Promise<AgencyDetailsDto[]> {
        const result = await this.agencyV3Service.findAll();

        return result;
    }
}
```

- [ ] **Step 2: ビルドで型エラーが無いことを確認**

Run: `npm run build`
Expected: エラーなく完了。

- [ ] **Step 3: コミット**

```bash
git add src/libs/agency/presentation/agency.v3.controller.ts
git commit -m "refactor: :recycle: 事業者 v3 コントローラーの記法を統一する"
```

---

## Task 2: station v3 コントローラー（軸 A・B・F）

**Files:**
- Modify: `src/libs/station/presentation/station.v3.controller.ts`

- [ ] **Step 1: ファイル全体を以下に置換する**

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/core/modules/auth/auth.guard';
import { RBACGuard } from 'src/core/modules/rbac/rbac.guard';
import { StationDetailsDto } from '../usecase/dtos/station-details.dto';
import { StationV3Service } from '../usecase/station.v3.service';

@Controller()
@UseGuards(AuthGuard, RBACGuard)
export class StationV3Controller {
    constructor(private readonly stationV3Service: StationV3Service) {}

    @Get('/')
    async findAll(): Promise<StationDetailsDto[]> {
        const result = await this.stationV3Service.findAll();

        return result;
    }
}
```

- [ ] **Step 2: ビルド確認**

Run: `npm run build`
Expected: エラーなく完了。

- [ ] **Step 3: コミット**

```bash
git add src/libs/station/presentation/station.v3.controller.ts
git commit -m "refactor: :recycle: 駅 v3 コントローラーの記法を統一する"
```

---

## Task 3: calendar v3 コントローラー（軸 B・F）

**Files:**
- Modify: `src/libs/calendar/presentation/calendar.v3.controller.ts`

- [ ] **Step 1: ファイル全体を以下に置換する**

`@Get()`→`@Get('/')`、`@Get(':id')`→`@Get('/:id')`、`findMany` と `findOne` を冗長型へ。`findOneBySpecificDate` は既に冗長型なので維持。

```typescript
import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/core/modules/auth/auth.guard';
import { RBACGuard } from 'src/core/modules/rbac/rbac.guard';
import { CalendarV3Service } from '../usecase/calendar.v3.service';
import { CalendarDetailsDto } from '../usecase/dtos/calendar-details.dto';

@Controller()
@UseGuards(AuthGuard, RBACGuard)
export class CalendarV3Controller {
    constructor(private readonly calendarV3Service: CalendarV3Service) {}

    @Get('/')
    async findMany(
        @Query('serviceName') serviceName?: string,
    ): Promise<CalendarDetailsDto[]> {
        const result = await this.calendarV3Service.findMany({ serviceName });

        return result;
    }

    @Get('/as/of/:date')
    async findOneBySpecificDate(
        @Param('date') date: string,
    ): Promise<CalendarDetailsDto> {
        const result = await this.calendarV3Service.findOneBySpecificDate({
            date,
        });

        return result;
    }

    @Get('/:id')
    async findOne(@Param('id') id: string): Promise<CalendarDetailsDto> {
        const result = await this.calendarV3Service.findOne({ id });

        return result;
    }
}
```

- [ ] **Step 2: ビルド確認**

Run: `npm run build`
Expected: エラーなく完了。

- [ ] **Step 3: コミット**

```bash
git add src/libs/calendar/presentation/calendar.v3.controller.ts
git commit -m "refactor: :recycle: カレンダー v3 コントローラーの記法を統一する"
```

---

## Task 4: route v3 コントローラー（軸 A・B・F）

**Files:**
- Modify: `src/libs/route/presentation/route.v3.controller.ts`

- [ ] **Step 1: ファイル全体を以下に置換する**

```typescript
import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/core/modules/auth/auth.guard';
import { RBACGuard } from 'src/core/modules/rbac/rbac.guard';
import { RouteDetailsDto } from '../usecase/dtos/route-details.dto';
import { RouteStationsDto } from '../usecase/dtos/route-stations.dto';
import { RouteV3Service } from '../usecase/route.v3.service';

@Controller()
@UseGuards(AuthGuard, RBACGuard)
export class RouteV3Controller {
    constructor(private readonly routeV3Service: RouteV3Service) {}

    @Get('/')
    async findMany(
        @Query('serviceName') serviceName?: string,
    ): Promise<RouteDetailsDto[]> {
        const result = await this.routeV3Service.findMany({ serviceName });

        return result;
    }

    @Get('/:id/stations')
    async findOneWithStations(
        @Param('id') routeId: string,
    ): Promise<RouteStationsDto> {
        const result = await this.routeV3Service.findOneWithStations({
            routeId,
        });

        return result;
    }
}
```

- [ ] **Step 2: ビルド確認**

Run: `npm run build`
Expected: エラーなく完了。

- [ ] **Step 3: コミット**

```bash
git add src/libs/route/presentation/route.v3.controller.ts
git commit -m "refactor: :recycle: 路線 v3 コントローラーの記法を統一する"
```

---

## Task 5: service v3 コントローラー（軸 A・B・F）

**Files:**
- Modify: `src/libs/service/presentation/service.v3.controller.ts`

- [ ] **Step 1: ファイル全体を以下に置換する**

```typescript
import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/core/modules/auth/auth.guard';
import { RBACGuard } from 'src/core/modules/rbac/rbac.guard';
import { StationDetailsDto } from 'src/libs/station/usecase/dtos/station-details.dto';
import { ServiceAgenciesDto } from '../usecase/dtos/service-agencies.dto';
import { ServiceDetailsDto } from '../usecase/dtos/service-details.dto';
import { ServiceRoutesDto } from '../usecase/dtos/service-routes.dto';
import { ServiceV3Service } from '../usecase/service.v3.service';

@Controller()
@UseGuards(AuthGuard, RBACGuard)
export class ServiceV3Controller {
    constructor(private readonly serviceV3Service: ServiceV3Service) {}

    @Get('/')
    async findMany(
        @Query('serviceName') serviceName?: string,
    ): Promise<ServiceDetailsDto[]> {
        const result = await this.serviceV3Service.findMany({ serviceName });

        return result;
    }

    @Get('/:id/stations')
    async findOneStations(
        @Param('id') serviceId: string,
    ): Promise<StationDetailsDto[]> {
        const result = await this.serviceV3Service.findOneStations({
            serviceId,
        });

        return result;
    }

    @Get('/:id/agencies')
    async findOneServiceWithAgencies(
        @Param('id') serviceId: string,
    ): Promise<ServiceAgenciesDto> {
        const result = await this.serviceV3Service.findOneWithAgencies({
            serviceId,
        });

        return result;
    }

    @Get('/:id/routes')
    async findOneServiceWithRoutes(
        @Param('id') serviceId: string,
    ): Promise<ServiceRoutesDto> {
        const result = await this.serviceV3Service.findOneWithRoutes({
            serviceId,
        });

        return result;
    }
}
```

- [ ] **Step 2: ビルド確認**

Run: `npm run build`
Expected: エラーなく完了。

- [ ] **Step 3: コミット**

```bash
git add src/libs/service/presentation/service.v3.controller.ts
git commit -m "refactor: :recycle: サービス v3 コントローラーの記法を統一する"
```

---

## Task 6: formation v3 コントローラー（軸 B）

**Files:**
- Modify: `src/libs/formation/presentation/formation.v3.controller.ts`

formation は既に async・先頭スラッシュ・Param クラス（period）を満たすので、冗長型（軸B）のみ適用する。

- [ ] **Step 1: ファイル全体を以下に置換する**

```typescript
import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/core/modules/auth/auth.guard';
import { RBACGuard } from 'src/core/modules/rbac/rbac.guard';
import { FormationDetailsDto } from '../usecase/dtos/formation-details.dto';
import { FormationV3Service } from '../usecase/formation.v3.service';
import { FormationFindManyBySpecificPeriodParam } from '../usecase/params/formation-find-many-by-specific-period.param';

@Controller()
@UseGuards(AuthGuard, RBACGuard)
export class FormationV3Controller {
    constructor(private readonly formationV3Service: FormationV3Service) {}

    @Get('/as/of/:date')
    async findManyBySpecificDate(
        @Param('date') date: string,
    ): Promise<FormationDetailsDto[]> {
        const result = await this.formationV3Service.findManyBySpecificDate({
            date,
        });

        return result;
    }

    @Get('/from/:startDate/to/:endDate')
    async findManyBySpecificPeriod(
        @Param() params: FormationFindManyBySpecificPeriodParam,
    ): Promise<FormationDetailsDto[]> {
        const result =
            await this.formationV3Service.findManyBySpecificPeriod(params);

        return result;
    }
}
```

- [ ] **Step 2: ビルド確認**

Run: `npm run build`
Expected: エラーなく完了。

- [ ] **Step 3: コミット**

```bash
git add src/libs/formation/presentation/formation.v3.controller.ts
git commit -m "refactor: :recycle: 編成 v3 コントローラーの記法を統一する"
```

---

## Task 7: operation `findOneWithTrips` の DTO 化（軸 G）＋冗長型（軸 B）

`{ operation: any; trips: any[] }` を専用 DTO に置換する。`trips` の実体は `operation.query.ts` の `dto.tripOperationLists`（= `TripOperationListDetailsDto[]`）、`operation` は `OperationDetailsDto`（calendar を含む）。型注釈のみの変更でランタイム出力は不変。

**Files:**
- Create: `src/libs/operation/usecase/dtos/operation-with-trips.dto.ts`
- Modify: `src/libs/operation/usecase/operation.v3.service.ts`
- Modify: `src/libs/operation/infrastructure/queries/operation.query.ts:290-293`（戻り型のみ）
- Modify: `src/libs/operation/presentation/operation.v3.controller.ts`

- [ ] **Step 1: DTO ファイルを新規作成する**

`src/libs/operation/usecase/dtos/operation-with-trips.dto.ts`:
```typescript
import { Expose, Type } from 'class-transformer';
import { TripOperationListDetailsDto } from 'src/libs/trip/usecase/dtos/trip-operation-list-details.dto';
import { OperationDetailsDto } from './operation-details.dto';

export class OperationWithTripsDto {
    @Expose()
    @Type(() => OperationDetailsDto)
    operation: OperationDetailsDto;

    @Expose()
    @Type(() => TripOperationListDetailsDto)
    trips: TripOperationListDetailsDto[];
}
```

- [ ] **Step 2: query の戻り型のみを差し替える**

`src/libs/operation/infrastructure/queries/operation.query.ts` の import ブロックで、既存の
`import { OperationDetailsDto } from '../../usecase/dtos/operation-details.dto';`
の直後に次の行を追加する:
```typescript
import { OperationWithTripsDto } from '../../usecase/dtos/operation-with-trips.dto';
```

続いて `findOneWithTrips` のシグネチャ（290〜293 行目）を差し替える。

old:
```typescript
    async findOneWithTrips(params: { operationId: string }): Promise<{
        operation: OperationDetailsDto;
        trips: any[];
    } | null> {
```
new:
```typescript
    async findOneWithTrips(
        params: { operationId: string },
    ): Promise<OperationWithTripsDto | null> {
```

> メソッド本体（`return { operation: ..., trips: ... }`）は変更しない。返却オブジェクトは `OperationWithTripsDto` と構造的に互換である。

- [ ] **Step 3: service の戻り型を差し替える**

`src/libs/operation/usecase/operation.v3.service.ts` を以下の全文に置換する:
```typescript
import { Injectable } from '@nestjs/common';
import { OperationQuery } from '../infrastructure/queries/operation.query';
import { OperationCurrentPositionDto } from './dtos/operation-current-position.dto';
import { OperationDetailsDto } from './dtos/operation-details.dto';
import { OperationWithTripsDto } from './dtos/operation-with-trips.dto';

@Injectable()
export class OperationV3Service {
    constructor(private readonly operationQuery: OperationQuery) {}

    findManyByCalendarId(params: {
        calendarId: string;
    }): Promise<OperationDetailsDto[]> {
        const { calendarId } = params;

        return this.operationQuery.findManyByCalendarId({
            calendarId,
        });
    }

    findManyBySpecificPeriod(params: {
        start: string;
        end: string;
    }): Promise<OperationDetailsDto[]> {
        const { start, end } = params;

        return this.operationQuery.findManyBySpecificPeriod({
            start,
            end,
        });
    }

    findOneWithCurrentPosition(params: {
        operationId: string;
        searchTime?: string;
    }): Promise<OperationCurrentPositionDto> {
        const { operationId, searchTime } = params;

        const result = this.operationQuery.findOneWithCurrentPosition({
            operationId,
            searchTime,
        });

        return result;
    }

    findOneWithTrips(params: {
        operationId: string;
    }): Promise<OperationWithTripsDto | null> {
        return this.operationQuery.findOneWithTrips(params);
    }
}
```

> 注: service 層のメソッドは元々 `async` 無し（Promise を直接返す）スタイル。軸 A/B はコントローラー層の規約であり、service 層には適用しない。ここでは型注釈以外を変えない。

- [ ] **Step 4: コントローラーを差し替える（軸 G の型適用 + 軸 B）**

`src/libs/operation/presentation/operation.v3.controller.ts` を以下の全文に置換する:
```typescript
import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/core/modules/auth/auth.guard';
import { RBACGuard } from 'src/core/modules/rbac/rbac.guard';
import { OperationCurrentPositionDto } from '../usecase/dtos/operation-current-position.dto';
import { OperationDetailsDto } from '../usecase/dtos/operation-details.dto';
import { OperationWithTripsDto } from '../usecase/dtos/operation-with-trips.dto';
import { OperationV3Service } from '../usecase/operation.v3.service';

@Controller()
@UseGuards(AuthGuard, RBACGuard)
export class OperationV3Controller {
    constructor(private readonly operationV3Service: OperationV3Service) {}

    @Get('/calendar/:calendarId')
    async findManyByCalendarId(
        @Param('calendarId') calendarId: string,
    ): Promise<OperationDetailsDto[]> {
        const result = await this.operationV3Service.findManyByCalendarId({
            calendarId,
        });

        return result;
    }

    @Get('/from/:start/to/:end')
    async findManyBySpecificPeriod(
        @Param('start') start: string,
        @Param('end') end: string,
    ): Promise<OperationDetailsDto[]> {
        const result = await this.operationV3Service.findManyBySpecificPeriod({
            start,
            end,
        });

        return result;
    }

    @Get('/:id/trips')
    async findOneWithTrips(
        @Param('id') operationId: string,
    ): Promise<OperationWithTripsDto> {
        const result = await this.operationV3Service.findOneWithTrips({
            operationId,
        });

        return result;
    }

    @Get('/:id/current-position')
    async findOneWithCurrentPosition(
        @Param('id') operationId: string,
        @Query('searchTime') searchTime?: string,
    ): Promise<OperationCurrentPositionDto> {
        const result = await this.operationV3Service.findOneWithCurrentPosition(
            {
                operationId,
                searchTime,
            },
        );

        return result;
    }
}
```

> `findOneWithTrips` の戻り型は元の非 null 注釈に合わせ `Promise<OperationWithTripsDto>` のままとする（strictNullChecks 無効のため service 側の `| null` と矛盾せずコンパイルされる。従来挙動と同一）。

- [ ] **Step 5: ビルドと既存テストを確認**

Run: `npm run build`
Expected: エラーなく完了。

Run: `npm run test -- operation.v3.service`
Expected: 既存の `operation.v3.service.spec.ts` が PASS（型のみの変更なのでランタイム挙動不変）。

- [ ] **Step 6: コミット**

```bash
git add src/libs/operation/usecase/dtos/operation-with-trips.dto.ts src/libs/operation/usecase/operation.v3.service.ts src/libs/operation/infrastructure/queries/operation.query.ts src/libs/operation/presentation/operation.v3.controller.ts
git commit -m "refactor: :recycle: 運用 findOneWithTrips の戻り値を専用 DTO 化する"
```

---

## Task 8: trip v3 コントローラー（軸 B・C・D）

クエリパラメータ `calendarId` + `tripDirection` を専用 Query DTO に束縛し、手動 `UnprocessableEntityException` を撤去する。`stationId` は単一かつ自明な path パラメータなのでインライン束縛を維持。service シグネチャは変更不要（既に `{ stationId, calendarId, tripDirection: number }`）。

**Files:**
- Create: `src/libs/trip/usecase/params/trip-find-many-by-station-id.query.ts`
- Test: `src/libs/trip/usecase/params/trip-find-many-by-station-id.query.spec.ts`
- Modify: `src/libs/trip/presentation/trip.v3.controller.ts`

- [ ] **Step 1: Query DTO の失敗テストを書く**

`src/libs/trip/usecase/params/trip-find-many-by-station-id.query.spec.ts`:
```typescript
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { TripFindManyByStationIdQuery } from './trip-find-many-by-station-id.query';

describe('TripFindManyByStationIdQuery', () => {
    it('tripDirection を number へ変換し検証を通過する', async () => {
        const query = plainToInstance(TripFindManyByStationIdQuery, {
            calendarId: 'cal-1',
            tripDirection: '0',
        });

        const errors = await validate(query);

        expect(errors).toHaveLength(0);
        expect(query.tripDirection).toBe(0);
        expect(typeof query.tripDirection).toBe('number');
    });

    it('calendarId が無い場合は検証エラーになる', async () => {
        const query = plainToInstance(TripFindManyByStationIdQuery, {
            tripDirection: '0',
        });

        const errors = await validate(query);

        expect(errors.some((e) => e.property === 'calendarId')).toBe(true);
    });

    it('tripDirection が無い場合は検証エラーになる', async () => {
        const query = plainToInstance(TripFindManyByStationIdQuery, {
            calendarId: 'cal-1',
        });

        const errors = await validate(query);

        expect(errors.some((e) => e.property === 'tripDirection')).toBe(true);
    });
});
```

- [ ] **Step 2: テストを実行し、クラス未定義で失敗することを確認**

Run: `npm run test -- trip-find-many-by-station-id.query`
Expected: FAIL（`Cannot find module './trip-find-many-by-station-id.query'`）。

- [ ] **Step 3: Query DTO を作成する**

`src/libs/trip/usecase/params/trip-find-many-by-station-id.query.ts`:
```typescript
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString } from 'class-validator';

export class TripFindManyByStationIdQuery {
    @IsString()
    @IsNotEmpty()
    calendarId: string;

    @Type(() => Number)
    @IsInt()
    tripDirection: number;
}
```

- [ ] **Step 4: テストを実行し PASS を確認**

Run: `npm run test -- trip-find-many-by-station-id.query`
Expected: 3 件すべて PASS。

- [ ] **Step 5: コントローラーを差し替える（軸 B・C・D）**

`src/libs/trip/presentation/trip.v3.controller.ts` を以下の全文に置換する:
```typescript
import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/core/modules/auth/auth.guard';
import { RBACGuard } from 'src/core/modules/rbac/rbac.guard';
import { TripDetailsDto } from '../usecase/dtos/trip-details.dto';
import { TripFindManyByStationIdQuery } from '../usecase/params/trip-find-many-by-station-id.query';
import { TripV3Service } from '../usecase/trip.v3.service';

@Controller()
@UseGuards(AuthGuard, RBACGuard)
export class TripV3Controller {
    constructor(private readonly tripV3Service: TripV3Service) {}

    @Get('/station/:stationId')
    async findManyByStationId(
        @Param('stationId') stationId: string,
        @Query() query: TripFindManyByStationIdQuery,
    ): Promise<TripDetailsDto[]> {
        const result = await this.tripV3Service.findManyByStationId({
            stationId,
            calendarId: query.calendarId,
            tripDirection: query.tripDirection,
        });

        return result;
    }
}
```

- [ ] **Step 6: ビルド確認**

Run: `npm run build`
Expected: エラーなく完了。

- [ ] **Step 7: コミット**

```bash
git add src/libs/trip/usecase/params/trip-find-many-by-station-id.query.ts src/libs/trip/usecase/params/trip-find-many-by-station-id.query.spec.ts src/libs/trip/presentation/trip.v3.controller.ts
git commit -m "refactor: :recycle: トリップ v3 コントローラーのクエリ束縛を DTO 化する"
```

---

## Task 9: trip-block v3 コントローラー＋サービス（軸 B・C・D・E）

- フィルタ（`findManyByFilter`）: 手動 `UnprocessableEntityException` を撤去し Query DTO 化（C・D）。
- 書込（replace/add/delete）: 既存の共有 Param クラスを `@Param() p: XParam` で束縛（D）、service へはオブジェクト `{ id, dto }` で渡す（E）。
- 全メソッド冗長型（B）。
- `findOneById` は単一かつ自明な `:id` なのでインライン束縛を維持（formation 参照実装に倣う）。
- `createManyTripBlocks` は配列ボディ 1 引数なのでオブジェクト包装しない（operation-sighting `post(body)` と同様）。冗長型のみ適用。

**Files:**
- Create: `src/libs/trip-block/usecase/params/trip-block-find-many-by-filter.query.ts`
- Test: `src/libs/trip-block/usecase/params/trip-block-find-many-by-filter.query.spec.ts`
- Modify: `src/libs/trip-block/usecase/trip-block.v3.service.ts`
- Modify: `src/libs/trip-block/presentation/trip-block.v3.controller.ts`

- [ ] **Step 1: Query DTO の失敗テストを書く**

`src/libs/trip-block/usecase/params/trip-block-find-many-by-filter.query.spec.ts`:
```typescript
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { TripBlockFindManyByFilterQuery } from './trip-block-find-many-by-filter.query';

describe('TripBlockFindManyByFilterQuery', () => {
    it('tripDirection を number へ変換し検証を通過する', async () => {
        const query = plainToInstance(TripBlockFindManyByFilterQuery, {
            calendarId: 'cal-1',
            tripDirection: '1',
        });

        const errors = await validate(query);

        expect(errors).toHaveLength(0);
        expect(query.tripDirection).toBe(1);
        expect(typeof query.tripDirection).toBe('number');
    });

    it('calendarId が無い場合は検証エラーになる', async () => {
        const query = plainToInstance(TripBlockFindManyByFilterQuery, {
            tripDirection: '1',
        });

        const errors = await validate(query);

        expect(errors.some((e) => e.property === 'calendarId')).toBe(true);
    });

    it('tripDirection が無い場合は検証エラーになる', async () => {
        const query = plainToInstance(TripBlockFindManyByFilterQuery, {
            calendarId: 'cal-1',
        });

        const errors = await validate(query);

        expect(errors.some((e) => e.property === 'tripDirection')).toBe(true);
    });
});
```

- [ ] **Step 2: テストを実行し失敗を確認**

Run: `npm run test -- trip-block-find-many-by-filter.query`
Expected: FAIL（モジュール未定義）。

- [ ] **Step 3: Query DTO を作成する**

`src/libs/trip-block/usecase/params/trip-block-find-many-by-filter.query.ts`:
```typescript
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString } from 'class-validator';

export class TripBlockFindManyByFilterQuery {
    @IsString()
    @IsNotEmpty()
    calendarId: string;

    @Type(() => Number)
    @IsInt()
    tripDirection: number;
}
```

- [ ] **Step 4: テストを実行し PASS を確認**

Run: `npm run test -- trip-block-find-many-by-filter.query`
Expected: 3 件すべて PASS。

- [ ] **Step 5: service の書込3メソッドをオブジェクト引数へ変更する（軸 E）**

`src/libs/trip-block/usecase/trip-block.v3.service.ts` を以下の全文に置換する。`findManyByFilter` / `findOneById` / `createManyTripBlocks` は不変。書込3メソッドは引数を `{ id, dto }` に変え、本体冒頭で分解する（内部ロジックは元のまま）。

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { Trips } from 'src/libs/trip/domain/trip.domain';
import { TripBlock } from '../domain/trip-block.domain';
import { TripBlockCommand } from '../infrastructure/commands/trip-block.command';
import { TripBlockQuery } from '../infrastructure/queries/trip-block.query';
import {
    TripBlockDomainBuilder,
    TripBlocksDomainBuilder,
} from './builders/trip-block.domain.builder';
import { AddTripToTripBlockDto } from './dtos/add-trip-to-trip-block.dto';
import { CreateTripBlockDto } from './dtos/create-trip-block.dto';
import { DeleteTripFromTripBlockDto } from './dtos/delete-trip-from-trip-block.dto';
import { ReplaceTripBlockDto } from './dtos/replace-trip-block.dto';
import { TripBlockDetailsDto } from './dtos/trip-block-details.dto';

@Injectable()
export class TripBlockV3Service {
    constructor(
        private readonly tripBlockCommand: TripBlockCommand,
        private readonly tripBlockQuery: TripBlockQuery,
    ) {}

    findManyByFilter(params: {
        calendarId: string;
        tripDirection: number;
    }): Promise<TripBlockDetailsDto[]> {
        return this.tripBlockQuery.findManyByFilter(params);
    }

    findOneById(params: { id: string }): Promise<TripBlockDetailsDto | null> {
        return this.tripBlockQuery.findOneById(params);
    }

    async createManyTripBlocks(
        dtos: CreateTripBlockDto[],
    ): Promise<TripBlockDetailsDto[]> {
        const domains = TripBlocksDomainBuilder.buildByCreateDto(dtos);
        return this.tripBlockCommand.bulkCreate(domains);
    }

    async replaceOneTripBlock(params: {
        id: string;
        dto: ReplaceTripBlockDto;
    }): Promise<TripBlockDetailsDto> {
        const { id, dto } = params;

        const domain = TripBlockDomainBuilder.buildByReplaceDto({
            ...dto,
            id,
        });
        return this.tripBlockCommand.replaceOneTripBlockByDomain(domain);
    }

    async addTripToTripBlock(params: {
        id: string;
        dto: AddTripToTripBlockDto;
    }): Promise<TripBlockDetailsDto> {
        const { id, dto } = params;

        const tripBlockDto = {
            from: await this.tripBlockQuery.findOneTripBlockByTripId(
                dto.tripId,
            ),
            to: await this.tripBlockQuery.findOneTripBlockByTripBlockId(id),
        };

        if (!tripBlockDto.from || !tripBlockDto.to) {
            throw new NotFoundException('Either TripBlock is not found.');
        }

        const tripBlock = {
            from: TripBlockDomainBuilder.buildByDetailsDto(tripBlockDto.from),
            to: TripBlockDomainBuilder.buildByDetailsDto(tripBlockDto.to),
        };

        const trip = tripBlock.from.getTripByTripId(dto.tripId);

        tripBlock.from.removeTrip(trip);
        tripBlock.to.addTrip(trip);

        await this.tripBlockCommand.replaceOneTripBlockByDomain(tripBlock.to);

        const result = await this.tripBlockQuery.findOneById({ id });

        if (tripBlock.from.isTripEmpty()) {
            await this.tripBlockCommand.deleteOneTripBlockByDomain(
                tripBlock.from,
            );
        }

        return result;
    }

    async deleteTripFromTripBlock(params: {
        id: string;
        dto: DeleteTripFromTripBlockDto;
    }): Promise<TripBlockDetailsDto> {
        const { id, dto } = params;

        const tripBlockDto =
            await this.tripBlockQuery.findOneTripBlockByTripBlockId(id);

        if (!tripBlockDto) {
            throw new NotFoundException('TripBlock is not found.');
        }

        const tripBlock =
            TripBlockDomainBuilder.buildByDetailsDto(tripBlockDto);

        const trip = tripBlock.getTripByTripId(dto.tripId);

        if (!trip) {
            throw new NotFoundException('Trip is not include this TripBlock.');
        }

        tripBlock.removeTrip(trip);

        const replaceSpecifiedTripBlock = async () => {
            await this.tripBlockCommand.replaceOneTripBlockByDomain(tripBlock);
        };

        const replaceAsAnotherTripBlock = async () => {
            const emptyTripBlock = TripBlock.create({
                trips: Trips.create([]),
            });

            emptyTripBlock.addTrip(trip);

            await this.tripBlockCommand.replaceOneTripBlockByDomain(
                emptyTripBlock,
            );
        };

        if (dto.holdAsAnotherTripBlock) {
            await replaceAsAnotherTripBlock();
        } else {
            await replaceSpecifiedTripBlock();
        }

        const result = await this.tripBlockQuery.findOneById({ id });

        if (tripBlock.isTripEmpty()) {
            await this.tripBlockCommand.deleteOneTripBlockByDomain(tripBlock);
        }

        return result;
    }
}
```

- [ ] **Step 6: コントローラーを差し替える（軸 B・C・D・E）**

`src/libs/trip-block/presentation/trip-block.v3.controller.ts` を以下の全文に置換する。`UnprocessableEntityException` の import は不要になるので削除する。

```typescript
import {
    Body,
    Controller,
    Get,
    Param,
    Patch,
    Post,
    Put,
    Query,
    UseGuards,
} from '@nestjs/common';
import { AuthGuard } from 'src/core/modules/auth/auth.guard';
import { RBACGuard } from 'src/core/modules/rbac/rbac.guard';
import { AddTripToTripBlockDto } from '../usecase/dtos/add-trip-to-trip-block.dto';
import { CreateTripBlockDto } from '../usecase/dtos/create-trip-block.dto';
import { DeleteTripFromTripBlockDto } from '../usecase/dtos/delete-trip-from-trip-block.dto';
import { ReplaceTripBlockDto } from '../usecase/dtos/replace-trip-block.dto';
import { TripBlockDetailsDto } from '../usecase/dtos/trip-block-details.dto';
import { AddTripToTripBlockParam } from '../usecase/params/add-trip-to-trip-block.param';
import { DeleteTripFromTripBlockParam } from '../usecase/params/delete-trip-from-trip-block.param';
import { ReplaceTripBlockParam } from '../usecase/params/replace-trip-block.param';
import { TripBlockFindManyByFilterQuery } from '../usecase/params/trip-block-find-many-by-filter.query';
import { TripBlockV3Service } from '../usecase/trip-block.v3.service';

@Controller()
@UseGuards(AuthGuard, RBACGuard)
export class TripBlockV3Controller {
    constructor(private readonly tripBlockV3Service: TripBlockV3Service) {}

    @Get('/')
    async findManyByFilter(
        @Query() query: TripBlockFindManyByFilterQuery,
    ): Promise<TripBlockDetailsDto[]> {
        const result = await this.tripBlockV3Service.findManyByFilter({
            calendarId: query.calendarId,
            tripDirection: query.tripDirection,
        });

        return result;
    }

    @Get('/:id')
    async findOneById(@Param('id') id: string): Promise<TripBlockDetailsDto> {
        const result = await this.tripBlockV3Service.findOneById({ id });

        return result;
    }

    @Post('/bulk')
    async createManyTripBlocks(
        @Body() dtos: CreateTripBlockDto[],
    ): Promise<TripBlockDetailsDto[]> {
        const result = await this.tripBlockV3Service.createManyTripBlocks(dtos);

        return result;
    }

    @Put('/:id')
    async replaceOneTripBlock(
        @Param() param: ReplaceTripBlockParam,
        @Body() dto: ReplaceTripBlockDto,
    ): Promise<TripBlockDetailsDto> {
        const result = await this.tripBlockV3Service.replaceOneTripBlock({
            id: param.id,
            dto,
        });

        return result;
    }

    @Patch('/:id/add-trip')
    async addTripToTripBlock(
        @Param() param: AddTripToTripBlockParam,
        @Body() dto: AddTripToTripBlockDto,
    ): Promise<TripBlockDetailsDto> {
        const result = await this.tripBlockV3Service.addTripToTripBlock({
            id: param.id,
            dto,
        });

        return result;
    }

    @Patch('/:id/delete-trip')
    async deleteTripFromTripBlock(
        @Param() param: DeleteTripFromTripBlockParam,
        @Body() dto: DeleteTripFromTripBlockDto,
    ): Promise<TripBlockDetailsDto> {
        const result = await this.tripBlockV3Service.deleteTripFromTripBlock({
            id: param.id,
            dto,
        });

        return result;
    }
}
```

- [ ] **Step 7: ビルドと該当テストを確認**

Run: `npm run build`
Expected: エラーなく完了。

Run: `npm run test -- trip-block`
Expected: 既存 `trip-block.v2.service.spec.ts` と新規 Query DTO テストが PASS（v3 service のシグネチャ変更を参照するのは v3 コントローラーのみで、ビルドが通れば整合）。

- [ ] **Step 8: コミット**

```bash
git add src/libs/trip-block/usecase/params/trip-block-find-many-by-filter.query.ts src/libs/trip-block/usecase/params/trip-block-find-many-by-filter.query.spec.ts src/libs/trip-block/usecase/trip-block.v3.service.ts src/libs/trip-block/presentation/trip-block.v3.controller.ts
git commit -m "refactor: :recycle: トリップブロック v3 のパラメータ束縛と引数を統一する"
```

---

## Task 10: 全体検証（ビルド・lint・テスト一括）

**Files:** なし（検証のみ）

- [ ] **Step 1: フルビルド**

Run: `npm run build`
Expected: 型エラー 0 で完了。

- [ ] **Step 2: lint（自動修正込み）**

Run: `npm run lint`
Expected: エラー 0。自動修正で差分が出た場合は内容を確認し、軸 H（import 順）の無関係な並べ替えが混入していないかをチェックする。意図しない差分があれば revert する。

- [ ] **Step 3: 全テスト**

Run: `npm run test`
Expected: 全 PASS。

- [ ] **Step 4: lint 差分があった場合のみコミット**

```bash
git add -A
git commit -m "chore: :wrench: lint 自動修正を反映する"
```
（差分が無ければスキップ。）

---

## 受け入れ条件（Definition of Done）

- [ ] 全 v3 コントローラーのハンドラが `async` + 冗長型（`const result = await ...; return result;`）になっている（軸 A・B）。
- [ ] `trip` / `trip-block` のフィルタ系から手動 `UnprocessableEntityException` が消え、Query DTO に検証が移譲されている（軸 C・D）。
- [ ] `trip-block` 書込3メソッドが `@Param() p: XParam` 束縛 + service へ `{ id, dto }` オブジェクト引数になっている（軸 D・E）。
- [ ] 全 v3 ルートパスが先頭スラッシュ付き（軸 F）。
- [ ] `operation.findOneWithTrips` の戻り値が `OperationWithTripsDto` で `any` が排除されている（軸 G）。
- [ ] `npm run build` / `npm run lint` / `npm run test` がすべて成功する。
- [ ] `operation-sighting.v3.controller.ts`・全 v2・vehicle・entity・migration に差分が無い。
- [ ] import 順（軸 H）の無関係な並べ替え差分が混入していない。

---

## 自己レビュー結果（計画作成者による点検）

- **仕様カバレッジ:** 7 軸すべてに対応タスクを割当（A/B: Task 1-9、C/D: Task 8-9、E: Task 9、F: Task 1-5・既存準拠分は確認のみ、G: Task 7）。対象外（H・operation-sighting・v2・vehicle）も明記。
- **プレースホルダ:** 各コード変更ステップは完全な全文または厳密な old/new を提示。「適切に」「等」での誤魔化しなし。
- **型整合:** service `replaceOneTripBlock({ id, dto })` ⇔ コントローラー呼び出し、`OperationWithTripsDto`（query→service→controller）でフィールド名・型が一貫。`TripBlockFindManyByFilterQuery` / `TripFindManyByStationIdQuery` のプロパティ名は service の引数オブジェクトと一致。
