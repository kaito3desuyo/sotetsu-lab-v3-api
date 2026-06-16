# Builder クラス命名・構造統一 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `src/libs/**/builders/` 配下に散在する Builder の命名・構造・ファイル名の揺れを単一パターンに統一し、ついでに standalone 関数経由で混入していた `formationId`/`operationId` 欠落バグを修正する。

**Architecture:** Builder は役割で 3 種（DTO→ドメインの `DomainBuilder`、Model→DTO の `DtoBuilder`、ドメイン→Model の `ModelBuilder`）。全メソッドのプレフィックスを変換元基準の `buildFrom<元>` に統一する。単数 Builder と複数 Builder を別 export に分け、複数は単数を `map` する。standalone 関数（`buildXxxDetailsDto`）は全廃して Builder に集約する。ファイル名はドット 3 トークン `<entity>.dto.builder.ts` 等に統一する。

**Tech Stack:** NestJS 10 / TypeScript 4.7 / class-transformer (`plainToClass` + `transformerOptions`)

---

## 統一パターン（全タスク共通の基準）

### メソッド名

| 種別 | 変換 | メソッド名 |
|---|---|---|
| DomainBuilder (`usecase/builders/`) | DTO → ドメイン | `buildFromDetailsDto` / `buildFromCreateDto` / `buildFromReplaceDto` |
| DtoBuilder (`infrastructure/builders/`) | Model → DTO | `buildFromModel` |
| ModelBuilder (`infrastructure/builders/`) | ドメイン → Model | `buildFromDomain` |

- 廃止する名前: `buildByDetailsDto` / `buildByCreateDto` / `buildByReplaceDto`（→ `buildFrom*`）、`toDetailsDto` / `toDetailsDtos` / `toStationsDto` / `toRoutesDto`（→ `buildFromModel`）、`buildFromModels` / `buildFromDomains`（→ 複数形 Builder の `buildFromModel` / `buildFromDomain`）。

### 構造ルール

- 単数 Builder と複数 Builder は **別 export**。複数は単数を `map`。メソッド名は単複どちらも同じ（`buildFromModel` / `buildFromDomain` / `buildFrom*Dto`）。
- 全 Builder オブジェクトに `as const` を付与する。
- 出力 DTO 型が異なる変換（例: `RouteModel`→`RouteStationsDto`）は同一 Builder に同名メソッドで同居できないため、**別 Builder・別ファイル**に分離する（既存 `ServiceAgenciesDtoBuilder` の前例に倣う）。
- DtoBuilder の標準テンプレート（素の変換のドメイン）:

```ts
import { plainToClass } from 'class-transformer';
import { transformerOptions } from 'src/core/configs/transformer-options';
import { XDetailsDto } from '../../usecase/dtos/x-details.dto';
import { XModel } from '../models/x.model';

export const XDtoBuilder = {
    buildFromModel: (model: XModel): XDetailsDto => {
        return plainToClass(XDetailsDto, model, transformerOptions);
    },
} as const;

export const XsDtoBuilder = {
    buildFromModel: (models: XModel[]): XDetailsDto[] => {
        return models.map((model) => XDtoBuilder.buildFromModel(model));
    },
} as const;
```

### ファイル名

ドット 3 トークンに統一する: `<entity>.dto.builder.ts` / `<entity>.model.builder.ts` / `<entity>.domain.builder.ts`。リネームは `git mv` で行い、import しているファイルのパスも同タスク内で更新する。

### 複数形 export 名（英語複数）

`AgenciesDtoBuilder` / `VehiclesDtoBuilder` / `StationsDtoBuilder` / `CalendarsDtoBuilder` / `TripClassesDtoBuilder`（既存名再利用）/ `RoutesDtoBuilder` / `ServicesDtoBuilder` / `FormationsDtoBuilder`（既存）/ `OperationsDtoBuilder`（既存）/ `OperationSightingsDtoBuilder` / `OperationSightingLatestCachesDtoBuilder`。

### 検証戦略

Builder 専用の `.spec.ts` は存在しない。各タスクの検証は型システムと既存テストで担保する:

- `npm run build` — 型チェック（メソッド改名・import パス変更の取りこぼしはここでコンパイルエラーになる）
- `npm run lint` — ESLint 自動修正
- 全体最終のみ `npm run test` と `npm run test:e2e`

各タスクは「Builder を最終形に書き換え → 呼び出し側を全置換 → `npm run build` がエラー 0 → `npm run lint` → コミット」の順で完結させる。

---

## Task 0: 作業ブランチ作成

**Files:** なし（git 操作のみ）

- [ ] **Step 1: リポジトリのデフォルトブランチから作業ブランチを作成**

Run:
```bash
cd /home/seapolis/Projects/sotetsu-lab-v3/sotetsu-lab-v3-api
git switch -c refactor/builder-unification
git commit --allow-empty -m "first commit"
```
Expected: 新ブランチに切り替わり、空コミットが 1 つ作られる。

---

## Task 1: DomainBuilder の `buildBy*` → `buildFrom*` 統一 + typo 修正

**対象:** DomainBuilder は相互参照があるため一括で変換する。typo `TripOperationListsDomainBulder` も同時に修正する。

**Files:**
- Modify: `src/libs/trip/usecase/builders/time.domain.builder.ts`
- Modify: `src/libs/trip/usecase/builders/trip-operation-list.domain.builder.ts`
- Modify: `src/libs/trip/usecase/builders/trip.domain.builder.ts`
- Modify: `src/libs/trip-block/usecase/builders/trip-block.domain.builder.ts`
- Modify: `src/libs/operation-sighting/usecase/builders/operation-sighting.domain.builder.ts`
- Modify（呼び出し側）: `src/libs/trip-block/usecase/trip-block.cli.service.ts`, `trip-block.v2.service.ts`, `trip-block.v3.service.ts`
- Modify（呼び出し側）: `src/libs/operation-sighting/usecase/operation-sighting.v2.service.ts`, `operation-sighting.v3.service.ts`

- [ ] **Step 1: メソッド名を一括置換**

各 DomainBuilder ファイルおよび呼び出し側で、以下を文字列置換する（メソッド名のみ。型名・export 名は変えない）:
- `buildByDetailsDto` → `buildFromDetailsDto`
- `buildByCreateDto` → `buildFromCreateDto`
- `buildByReplaceDto` → `buildFromReplaceDto`

Run（対象を絞った一括置換）:
```bash
cd /home/seapolis/Projects/sotetsu-lab-v3/sotetsu-lab-v3-api
grep -rl "buildBy\(Details\|Create\|Replace\)Dto" src/libs \
  | xargs sed -i \
    -e 's/buildByDetailsDto/buildFromDetailsDto/g' \
    -e 's/buildByCreateDto/buildFromCreateDto/g' \
    -e 's/buildByReplaceDto/buildFromReplaceDto/g'
```

- [ ] **Step 2: typo `Bulder` → `Builder` を修正**

`TripOperationListsDomainBulder`（宣言: `trip-operation-list.domain.builder.ts:836`、参照: `trip.domain.builder.ts:870,888,908,927`）を `TripOperationListsDomainBuilder` に統一する。

Run:
```bash
cd /home/seapolis/Projects/sotetsu-lab-v3/sotetsu-lab-v3-api
grep -rl "TripOperationListsDomainBulder" src/libs \
  | xargs sed -i 's/TripOperationListsDomainBulder/TripOperationListsDomainBuilder/g'
```

- [ ] **Step 3: `as const` の欠落を補う**

`src/libs/trip/usecase/builders/trip.domain.builder.ts` の `TripDomainBuilder`（934 行目付近の閉じ括弧 `};`）に `as const` が無い。`as const` を付与する。
変更前:
```ts
    },
};

export const TripsDomainBuilder = {
```
変更後:
```ts
    },
} as const;

export const TripsDomainBuilder = {
```

- [ ] **Step 4: ビルドで型チェック**

Run: `npm run build`
Expected: エラー 0 で完了。

- [ ] **Step 5: lint**

Run: `npm run lint`
Expected: エラー 0。

- [ ] **Step 6: コミット**

```bash
git add -A
git commit -m "refactor: :recycle: DomainBuilder のメソッド名を buildFrom* に統一し typo を修正する"
```

---

## Task 2: operation-sighting infra Builder（複数形分離・standalone 集約）

**対象:** `OperationSightingDtoBuilder`（`buildFromModels` 同居 + standalone 同居）、`OperationSightingLatestCacheDtoBuilder`（`buildFromModels` 同居）、`OperationSightingLatestCacheModelBuilder`（`buildFromDomains` 同居）を別 export に分離。standalone `buildOperationSightingDetailsDto` を集約（中身は `operationSightingId` 付きで Builder と同一 → 挙動不変）。

**Files:**
- Modify → rename: `src/libs/operation-sighting/infrastructure/builders/operation-sighting-dto.builder.ts` → `operation-sighting.dto.builder.ts`
- Modify → rename: `operation-sighting-latest-cache-dto.builder.ts` → `operation-sighting-latest-cache.dto.builder.ts`
- Modify: `operation-sighting-latest-cache.model.builder.ts`（ファイル名は既にドット）
- Modify（呼び出し側）: `src/libs/operation-sighting/infrastructure/queries/operation-sighting.query.ts`, `operation-sighting-latest-cache.query.ts`
- Modify（呼び出し側）: `src/libs/operation-sighting/infrastructure/command/operation-sighting.command.ts`, `operation-sighting-latest-cache.command.ts`

- [ ] **Step 1: `operation-sighting.dto.builder.ts` を最終形に書き換え**

ファイルを `git mv` でリネームしてから内容を以下にする:
```bash
git mv src/libs/operation-sighting/infrastructure/builders/operation-sighting-dto.builder.ts \
       src/libs/operation-sighting/infrastructure/builders/operation-sighting.dto.builder.ts
```
内容:
```ts
import { plainToClass } from 'class-transformer';
import { transformerOptions } from 'src/core/configs/transformer-options';
import { OperationSightingDetailsDto } from '../../usecase/dtos/operation-sighting-details.dto';
import { OperationSightingModel } from '../models/operation-sighting.model';

export const OperationSightingDtoBuilder = {
    buildFromModel: (
        model: OperationSightingModel,
    ): OperationSightingDetailsDto => {
        return plainToClass(
            OperationSightingDetailsDto,
            {
                ...model,
                operationSightingId: model.id,
            },
            transformerOptions,
        );
    },
} as const;

export const OperationSightingsDtoBuilder = {
    buildFromModel: (
        models: OperationSightingModel[],
    ): OperationSightingDetailsDto[] => {
        return models.map((model) =>
            OperationSightingDtoBuilder.buildFromModel(model),
        );
    },
} as const;
```

- [ ] **Step 2: `operation-sighting-latest-cache.dto.builder.ts` を分離**

```bash
git mv src/libs/operation-sighting/infrastructure/builders/operation-sighting-latest-cache-dto.builder.ts \
       src/libs/operation-sighting/infrastructure/builders/operation-sighting-latest-cache.dto.builder.ts
```
内容:
```ts
import { plainToClass } from 'class-transformer';
import { transformerOptions } from 'src/core/configs/transformer-options';
import { OperationSightingLatestCacheDto } from '../../usecase/dtos/operation-sighting-latest-cache.dto';
import { OperationSightingLatestCacheModel } from '../models/operation-sighting-latest-cache.model';

export const OperationSightingLatestCacheDtoBuilder = {
    buildFromModel: (
        model: OperationSightingLatestCacheModel,
    ): OperationSightingLatestCacheDto => {
        return plainToClass(
            OperationSightingLatestCacheDto,
            {
                ...model,
                sightingTime: model.operationSighting?.sightingTime,
            },
            transformerOptions,
        );
    },
} as const;

export const OperationSightingLatestCachesDtoBuilder = {
    buildFromModel: (
        models: OperationSightingLatestCacheModel[],
    ): OperationSightingLatestCacheDto[] => {
        return models.map((model) =>
            OperationSightingLatestCacheDtoBuilder.buildFromModel(model),
        );
    },
} as const;
```

- [ ] **Step 3: `operation-sighting-latest-cache.model.builder.ts` の複数形を分離**

`buildFromDomains` を別 export `OperationSightingLatestCachesModelBuilder` に移す:
```ts
import { OperationSightingLatestCache } from '../../domain/operation-sighting-latest-cache.domain';
import { OperationSightingLatestCacheModel } from '../models/operation-sighting-latest-cache.model';

export const OperationSightingLatestCacheModelBuilder = {
    buildFromDomain: (
        domain: OperationSightingLatestCache,
    ): OperationSightingLatestCacheModel => {
        return {
            id: domain.id.value,
            operationNumber: domain.props.operationNumber,
            formationNumber: domain.props.formationNumber,
            operationSightingId: domain.props.operationSightingId,
        };
    },
} as const;

export const OperationSightingLatestCachesModelBuilder = {
    buildFromDomain: (
        domains: OperationSightingLatestCache[],
    ): OperationSightingLatestCacheModel[] => {
        return domains.map((domain) =>
            OperationSightingLatestCacheModelBuilder.buildFromDomain(domain),
        );
    },
} as const;
```

- [ ] **Step 4: 呼び出し側を置換**

`operation-sighting.query.ts`:
- import パスを `'../builders/operation-sighting-dto.builder'` → `'../builders/operation-sighting.dto.builder'` に変更。
- import から `buildOperationSightingDetailsDto` を削除し、`OperationSightingDtoBuilder` と `OperationSightingsDtoBuilder` を import する。
- 単数 standalone 呼び出し `buildOperationSightingDetailsDto(x)`（行 35,38,120,123,205,208,262,300,397,458,555） → `OperationSightingDtoBuilder.buildFromModel(x)`。
  ただし `models.map((o) => buildOperationSightingDetailsDto(o))` の形は `OperationSightingsDtoBuilder.buildFromModel(models)` に置換する。
- `OperationSightingDtoBuilder.buildFromModels(x)`（行 250,616） → `OperationSightingsDtoBuilder.buildFromModel(x)`。

`operation-sighting-latest-cache.query.ts`:
- import パスをドット名に変更。
- `OperationSightingLatestCacheDtoBuilder.buildFromModels(x)`（行 48） → `OperationSightingLatestCachesDtoBuilder.buildFromModel(x)`。

`operation-sighting.command.ts`:
- import パスを `operation-sighting.dto.builder` に変更（メソッド名 `buildFromModel` は不変）。

`operation-sighting-latest-cache.command.ts`:
- `OperationSightingLatestCacheModelBuilder.buildFromDomains(x)`（行 35） → `OperationSightingLatestCachesModelBuilder.buildFromDomain(x)`。新 export を import に追加。

- [ ] **Step 5: ビルド・lint**

Run: `npm run build && npm run lint`
Expected: エラー 0。standalone を 1 つも import していないこと（`grep -rn buildOperationSightingDetailsDto src/libs` が builders 削除後ゼロ）。

- [ ] **Step 6: コミット**

```bash
git add -A
git commit -m "refactor: :recycle: 目撃情報の Builder を複数形分離し standalone を集約する"
```

---

## Task 3: formation（`as const` 付与・standalone 集約 = id 欠落バグ修正・ファイル名）

**注意:** standalone `buildFormationDetailsDto` は素の `plainToClass`（`formationId` 欠落）。`FormationDtoBuilder.buildFromModel` は `formationId: model.id` 付き。集約により欠落バグが直り、該当エンドポイントのレスポンスに `formationId` が乗るようになる（承認済み）。

**Files:**
- Modify → rename: `src/libs/formation/infrastructure/builders/formation-dto.builder.ts` → `formation.dto.builder.ts`
- Modify（呼び出し側）: `src/libs/formation/infrastructure/queries/formation.query.ts`

- [ ] **Step 1: `formation.dto.builder.ts` を最終形に**

```bash
git mv src/libs/formation/infrastructure/builders/formation-dto.builder.ts \
       src/libs/formation/infrastructure/builders/formation.dto.builder.ts
```
内容（standalone 削除・`as const` 付与）:
```ts
import { plainToClass } from 'class-transformer';
import { transformerOptions } from 'src/core/configs/transformer-options';
import { FormationDetailsDto } from '../../usecase/dtos/formation-details.dto';
import { FormationModel } from '../models/formation.model';

export const FormationDtoBuilder = {
    buildFromModel: (model: FormationModel): FormationDetailsDto => {
        return plainToClass(
            FormationDetailsDto,
            {
                ...model,
                formationId: model.id,
            },
            transformerOptions,
        );
    },
} as const;

export const FormationsDtoBuilder = {
    buildFromModel: (models: FormationModel[]): FormationDetailsDto[] => {
        return models.map((model) => FormationDtoBuilder.buildFromModel(model));
    },
} as const;
```

- [ ] **Step 2: `formation.query.ts` の呼び出しを置換**

- import: `buildFormationDetailsDto` を削除し、`FormationsDtoBuilder` を追加（`FormationDtoBuilder` は既存）。import パスを `'../builders/formation.dto.builder'` に変更。
- 行 55,93: `models.map((o) => buildFormationDetailsDto(o))` / `models.map((m) => buildFormationDetailsDto(m))` → `FormationsDtoBuilder.buildFromModel(models)`。
- 行 57: `models.data.map((o) => buildFormationDetailsDto(o))` → `FormationsDtoBuilder.buildFromModel(models.data)`。
- 行 130: `buildFormationDetailsDto(model)` → `FormationDtoBuilder.buildFromModel(model)`。
- 行 120,165,202: 既に `FormationDtoBuilder.buildFromModel` のため変更なし（120 は `result.map((model) => FormationDtoBuilder.buildFromModel(model))` だが `FormationsDtoBuilder.buildFromModel(result)` に寄せてもよい。揺れ統一の一環として寄せる）。

- [ ] **Step 3: ビルド・lint**

Run: `npm run build && npm run lint`
Expected: エラー 0。`grep -rn buildFormationDetailsDto src/libs` がゼロ。

- [ ] **Step 4: コミット**

```bash
git add -A
git commit -m "fix: :bug: 編成 Builder を集約し formationId 欠落を修正する"
```

---

## Task 4: operation（`toDetailsDto` 削除・standalone 集約 = id 欠落バグ修正・`as const`・ファイル名）

**注意:** Task 3 と同じく、standalone 集約で `operationId` 欠落が直る（承認済み）。`OperationCurrentPositionDtoBuilder` は特殊入力型でそのまま維持。

**Files:**
- Modify → rename: `src/libs/operation/infrastructure/builders/operation-dto.builder.ts` → `operation.dto.builder.ts`
- Modify（呼び出し側）: `src/libs/operation/infrastructure/queries/operation.query.ts`

- [ ] **Step 1: `operation.dto.builder.ts` を最終形に**

```bash
git mv src/libs/operation/infrastructure/builders/operation-dto.builder.ts \
       src/libs/operation/infrastructure/builders/operation.dto.builder.ts
```
内容（standalone・`toDetailsDto` 削除、`OperationsDtoBuilder` に `as const`）:
```ts
import { plainToClass } from 'class-transformer';
import { transformerOptions } from 'src/core/configs/transformer-options';
import { OperationDetailsDto } from '../../usecase/dtos/operation-details.dto';
import { OperationModel } from '../models/operation.model';

export const OperationDtoBuilder = {
    buildFromModel: (model: OperationModel): OperationDetailsDto => {
        return plainToClass(
            OperationDetailsDto,
            {
                ...model,
                operationId: model.id,
            },
            transformerOptions,
        );
    },
} as const;

export const OperationsDtoBuilder = {
    buildFromModel: (models: OperationModel[]): OperationDetailsDto[] => {
        return models.map((model) => OperationDtoBuilder.buildFromModel(model));
    },
} as const;
```

- [ ] **Step 2: `operation.query.ts` の呼び出しを置換**

- import: `buildOperationDetailsDto` を削除。`OperationDtoBuilder` / `OperationsDtoBuilder` を import（パスを `operation.dto.builder` に）。
- 行 76: `OperationsDtoBuilder.toDetailsDto(model)` → `OperationsDtoBuilder.buildFromModel(model)`。
- 行 53: `models.map((o) => buildOperationDetailsDto(o))` → `OperationsDtoBuilder.buildFromModel(models)`。
- 行 55: `models.data.map((o) => buildOperationDetailsDto(o))` → `OperationsDtoBuilder.buildFromModel(models.data)`。
- 行 115,317: `buildOperationDetailsDto(model)` → `OperationDtoBuilder.buildFromModel(model)`。
- 行 40,105,362: 既に Builder 使用のため変更なし。

- [ ] **Step 3: ビルド・lint**

Run: `npm run build && npm run lint`
Expected: エラー 0。`grep -rn "buildOperationDetailsDto\|toDetailsDto" src/libs/operation` がゼロ。

- [ ] **Step 4: コミット**

```bash
git add -A
git commit -m "fix: :bug: 運用 Builder を集約し operationId 欠落と重複メソッドを解消する"
```

---

## Task 5: agency（Builder 新設・ファイル名）

**Files:**
- Modify → rename: `src/libs/agency/infrastructure/builders/agency-dto.builder.ts` → `agency.dto.builder.ts`
- Modify（呼び出し側）: `src/libs/agency/infrastructure/queries/agency.query.ts`

- [ ] **Step 1: `agency.dto.builder.ts` を新設**

```bash
git mv src/libs/agency/infrastructure/builders/agency-dto.builder.ts \
       src/libs/agency/infrastructure/builders/agency.dto.builder.ts
```
内容（standalone を `AgencyDtoBuilder` + `AgenciesDtoBuilder` に置換。素の変換）:
```ts
import { plainToClass } from 'class-transformer';
import { transformerOptions } from 'src/core/configs/transformer-options';
import { AgencyDetailsDto } from '../../usecase/dtos/agency-details.dto';
import { AgencyModel } from '../models/agency.model';

export const AgencyDtoBuilder = {
    buildFromModel: (model: AgencyModel): AgencyDetailsDto => {
        return plainToClass(AgencyDetailsDto, model, transformerOptions);
    },
} as const;

export const AgenciesDtoBuilder = {
    buildFromModel: (models: AgencyModel[]): AgencyDetailsDto[] => {
        return models.map((model) => AgencyDtoBuilder.buildFromModel(model));
    },
} as const;
```

- [ ] **Step 2: `agency.query.ts` を置換**

- import: `buildAgencyDetailsDto` を削除し、`AgencyDtoBuilder` / `AgenciesDtoBuilder` を `'../builders/agency.dto.builder'` から import。
- 行 26: `models.map((o) => buildAgencyDetailsDto(o))` → `AgenciesDtoBuilder.buildFromModel(models)`。
- 行 28: `models.data.map((o) => buildAgencyDetailsDto(o))` → `AgenciesDtoBuilder.buildFromModel(models.data)`。
- 行 43: `buildAgencyDetailsDto(model)` → `AgencyDtoBuilder.buildFromModel(model)`。
- 行 51: `models.map((m) => buildAgencyDetailsDto(m))` → `AgenciesDtoBuilder.buildFromModel(models)`。

- [ ] **Step 3: ビルド・lint・コミット**

Run: `npm run build && npm run lint`
Expected: エラー 0。
```bash
git add -A
git commit -m "refactor: :recycle: 事業者 Builder を新設し standalone を廃止する"
```

---

## Task 6: vehicle（Builder 新設・ファイル名）

**Files:**
- Modify → rename: `src/libs/vehicle/infrastructure/builders/vehicle-dto.builder.ts` → `vehicle.dto.builder.ts`
- Modify（呼び出し側）: `src/libs/vehicle/infrastructure/queries/vehicle.query.ts`

- [ ] **Step 1: `vehicle.dto.builder.ts` を新設**

```bash
git mv src/libs/vehicle/infrastructure/builders/vehicle-dto.builder.ts \
       src/libs/vehicle/infrastructure/builders/vehicle.dto.builder.ts
```
内容:
```ts
import { plainToClass } from 'class-transformer';
import { transformerOptions } from 'src/core/configs/transformer-options';
import { VehicleDetailsDto } from '../../usecase/dtos/vehicle-details.dto';
import { VehicleModel } from '../models/vehicle.model';

export const VehicleDtoBuilder = {
    buildFromModel: (model: VehicleModel): VehicleDetailsDto => {
        return plainToClass(VehicleDetailsDto, model, transformerOptions);
    },
} as const;

export const VehiclesDtoBuilder = {
    buildFromModel: (models: VehicleModel[]): VehicleDetailsDto[] => {
        return models.map((model) => VehicleDtoBuilder.buildFromModel(model));
    },
} as const;
```

- [ ] **Step 2: `vehicle.query.ts` を置換**

- import: `buildVehicleDetailsDto` 削除、`VehicleDtoBuilder` / `VehiclesDtoBuilder` を `'../builders/vehicle.dto.builder'` から import。
- 行 28: `models.map((o) => buildVehicleDetailsDto(o))` → `VehiclesDtoBuilder.buildFromModel(models)`。
- 行 30: `models.data.map((o) => buildVehicleDetailsDto(o))` → `VehiclesDtoBuilder.buildFromModel(models.data)`。
- 行 45: `buildVehicleDetailsDto(model)` → `VehicleDtoBuilder.buildFromModel(model)`。

- [ ] **Step 3: ビルド・lint・コミット**

Run: `npm run build && npm run lint`
```bash
git add -A
git commit -m "refactor: :recycle: 車両 Builder を新設し standalone を廃止する"
```

---

## Task 7: station（Builder 新設・ファイル名）

**注意:** `station-dto.builder.ts` は `station.query.ts` のほか `service.query.ts` からも import されている。後者は Task 11 で対応するため、本タスクでは station 側のみ修正し、`service.query.ts` の import は **Task 11 まで一時的に壊れる**。そのため Task 7 単独では `npm run build` が `service.query.ts` のパスエラーを出す。対策として本タスクの Step 2 で `service.query.ts` の import パスも先行更新する（station の新ファイル名・新 export を使うよう Task 11 の station 参照分だけ前倒し修正）。

**Files:**
- Modify → rename: `src/libs/station/infrastructure/builders/station-dto.builder.ts` → `station.dto.builder.ts`
- Modify（呼び出し側）: `src/libs/station/infrastructure/queries/station.query.ts`
- Modify（クロスドメイン参照のみ）: `src/libs/service/infrastructure/queries/service.query.ts`（station 参照分のみ）

- [ ] **Step 1: `station.dto.builder.ts` を新設**

```bash
git mv src/libs/station/infrastructure/builders/station-dto.builder.ts \
       src/libs/station/infrastructure/builders/station.dto.builder.ts
```
内容:
```ts
import { plainToClass } from 'class-transformer';
import { transformerOptions } from 'src/core/configs/transformer-options';
import { StationDetailsDto } from '../../usecase/dtos/station-details.dto';
import { StationModel } from '../models/station.model';

export const StationDtoBuilder = {
    buildFromModel: (model: StationModel): StationDetailsDto => {
        return plainToClass(StationDetailsDto, model, transformerOptions);
    },
} as const;

export const StationsDtoBuilder = {
    buildFromModel: (models: StationModel[]): StationDetailsDto[] => {
        return models.map((model) => StationDtoBuilder.buildFromModel(model));
    },
} as const;
```

- [ ] **Step 2: `station.query.ts` を置換**

- import: `buildStationDetailsDto` 削除、`StationDtoBuilder` / `StationsDtoBuilder` を `'../builders/station.dto.builder'` から import。
- 行 28: `models.map((o) => buildStationDetailsDto(o))` → `StationsDtoBuilder.buildFromModel(models)`。
- 行 30: `models.data.map((o) => buildStationDetailsDto(o))` → `StationsDtoBuilder.buildFromModel(models.data)`。
- 行 45: `buildStationDetailsDto(model)` → `StationDtoBuilder.buildFromModel(model)`。
- 行 53: `models.map((m) => buildStationDetailsDto(m))` → `StationsDtoBuilder.buildFromModel(models)`。

- [ ] **Step 3: `service.query.ts` の station 参照を先行更新**

- import 行 9: `import { buildStationDetailsDto } from 'src/libs/station/infrastructure/builders/station-dto.builder';` → `import { StationsDtoBuilder } from 'src/libs/station/infrastructure/builders/station.dto.builder';`。
- 行 159: `models.map((m) => buildStationDetailsDto(m))` → `StationsDtoBuilder.buildFromModel(models)`。
- （service 自身の Builder 統一は Task 11。本タスクでは station 参照のみ触る。）

- [ ] **Step 4: ビルド・lint・コミット**

Run: `npm run build && npm run lint`
Expected: エラー 0（service の station 参照も解決済み）。
```bash
git add -A
git commit -m "refactor: :recycle: 駅 Builder を新設し standalone を廃止する"
```

---

## Task 8: calendar（standalone 集約・複数形新設・ファイル名）

**Files:**
- Modify → rename: `src/libs/calendar/infrastructure/builders/calendar-dto.builder.ts` → `calendar.dto.builder.ts`
- Modify（呼び出し側）: `src/libs/calendar/infrastructure/queries/calendar.query.ts`

- [ ] **Step 1: `calendar.dto.builder.ts` を最終形に**

```bash
git mv src/libs/calendar/infrastructure/builders/calendar-dto.builder.ts \
       src/libs/calendar/infrastructure/builders/calendar.dto.builder.ts
```
内容（standalone 削除・`CalendarsDtoBuilder` 追加。`CalendarDtoBuilder.buildFromModel` は素の変換で既存と同一）:
```ts
import { plainToClass } from 'class-transformer';
import { transformerOptions } from 'src/core/configs/transformer-options';
import { CalendarDetailsDto } from '../../usecase/dtos/calendar-details.dto';
import { CalendarModel } from '../models/calendar.model';

export const CalendarDtoBuilder = {
    buildFromModel: (model: CalendarModel): CalendarDetailsDto => {
        return plainToClass(CalendarDetailsDto, model, transformerOptions);
    },
} as const;

export const CalendarsDtoBuilder = {
    buildFromModel: (models: CalendarModel[]): CalendarDetailsDto[] => {
        return models.map((model) => CalendarDtoBuilder.buildFromModel(model));
    },
} as const;
```

- [ ] **Step 2: `calendar.query.ts` を置換**

- import: `buildCalendarDetailsDto` 削除、`CalendarDtoBuilder`（既存）+ `CalendarsDtoBuilder` を `'../builders/calendar.dto.builder'` から import。
- 行 44: `models.map((o) => buildCalendarDetailsDto(o))` → `CalendarsDtoBuilder.buildFromModel(models)`。
- 行 46: `models.data.map((o) => buildCalendarDetailsDto(o))` → `CalendarsDtoBuilder.buildFromModel(models.data)`。
- 行 61: `buildCalendarDetailsDto(model)` → `CalendarDtoBuilder.buildFromModel(model)`。
- 行 101: `models.map((m) => CalendarDtoBuilder.buildFromModel(m))` → `CalendarsDtoBuilder.buildFromModel(models)`（揺れ統一）。
- 行 79,136: 単数 `CalendarDtoBuilder.buildFromModel` のため変更なし。

- [ ] **Step 3: ビルド・lint・コミット**

Run: `npm run build && npm run lint`
Expected: `grep -rn buildCalendarDetailsDto src/libs` がゼロ。
```bash
git add -A
git commit -m "refactor: :recycle: カレンダー Builder を集約し複数形を分離する"
```

---

## Task 9: trip-class（`to*` → `buildFromModel`・standalone 集約・ファイル名）

**Files:**
- Modify → rename: `src/libs/trip-class/infrastructure/builders/trip-class-dto.builder.ts` → `trip-class.dto.builder.ts`
- Modify（呼び出し側）: `src/libs/trip-class/infrastructure/queries/trip-class.query.ts`

- [ ] **Step 1: `trip-class.dto.builder.ts` を最終形に**

```bash
git mv src/libs/trip-class/infrastructure/builders/trip-class-dto.builder.ts \
       src/libs/trip-class/infrastructure/builders/trip-class.dto.builder.ts
```
内容（standalone 削除、`toDetailsDto`/`toDetailsDtos` → `buildFromModel`）:
```ts
import { plainToClass } from 'class-transformer';
import { transformerOptions } from 'src/core/configs/transformer-options';
import { TripClassModel } from 'src/libs/trip-class/infrastructure/models/trip-class.model';
import { TripClassDetailsDto } from 'src/libs/trip-class/usecase/dtos/trip-class-details.dto';

export const TripClassDtoBuilder = {
    buildFromModel: (model: TripClassModel): TripClassDetailsDto => {
        return plainToClass(TripClassDetailsDto, model, transformerOptions);
    },
} as const;

export const TripClassesDtoBuilder = {
    buildFromModel: (models: TripClassModel[]): TripClassDetailsDto[] => {
        return models.map((model) => TripClassDtoBuilder.buildFromModel(model));
    },
} as const;
```

- [ ] **Step 2: `trip-class.query.ts` を置換**

- import: `buildTripClassDetailsDto` 削除、`TripClassDtoBuilder` / `TripClassesDtoBuilder` を `'../builders/trip-class.dto.builder'` から import。
- 行 37: `TripClassesDtoBuilder.toDetailsDtos(models)` → `TripClassesDtoBuilder.buildFromModel(models)`。
- 行 48: `models.map((o) => buildTripClassDetailsDto(o))` → `TripClassesDtoBuilder.buildFromModel(models)`。
- 行 50: `models.data.map((o) => buildTripClassDetailsDto(o))` → `TripClassesDtoBuilder.buildFromModel(models.data)`。

- [ ] **Step 3: ビルド・lint・コミット**

Run: `npm run build && npm run lint`
```bash
git add -A
git commit -m "refactor: :recycle: 列車種別 Builder のメソッド名を buildFromModel に統一する"
```

---

## Task 10: route（standalone 集約・`RouteStationsDtoBuilder` 分離・複数形・ファイル名）

**Files:**
- Modify → rename: `src/libs/route/infrastructure/builders/route-dto.builder.ts` → `route.dto.builder.ts`
- Create: `src/libs/route/infrastructure/builders/route-stations.dto.builder.ts`
- Modify（呼び出し側）: `src/libs/route/infrastructure/queries/route.query.ts`

- [ ] **Step 1: `route.dto.builder.ts` を最終形に（Details 用のみ残す）**

```bash
git mv src/libs/route/infrastructure/builders/route-dto.builder.ts \
       src/libs/route/infrastructure/builders/route.dto.builder.ts
```
内容（standalone → `RouteDtoBuilder`/`RoutesDtoBuilder`、`toStationsDto` は別ファイルへ移すので削除）:
```ts
import { plainToClass } from 'class-transformer';
import { transformerOptions } from 'src/core/configs/transformer-options';
import { RouteDetailsDto } from '../../usecase/dtos/route-details.dto';
import { RouteModel } from '../models/route.model';

export const RouteDtoBuilder = {
    buildFromModel: (model: RouteModel): RouteDetailsDto => {
        return plainToClass(RouteDetailsDto, model, transformerOptions);
    },
} as const;

export const RoutesDtoBuilder = {
    buildFromModel: (models: RouteModel[]): RouteDetailsDto[] => {
        return models.map((model) => RouteDtoBuilder.buildFromModel(model));
    },
} as const;
```

- [ ] **Step 2: `route-stations.dto.builder.ts` を新設（`toStationsDto` を `buildFromModel` 化して移設）**

```ts
import { plainToClass } from 'class-transformer';
import { transformerOptions } from 'src/core/configs/transformer-options';
import { RouteStationsDto } from '../../usecase/dtos/route-stations.dto';
import { RouteModel } from '../models/route.model';

export const RouteStationsDtoBuilder = {
    buildFromModel: (model: RouteModel): RouteStationsDto => {
        const sortedStations = [...(model.routeStationLists ?? [])].sort(
            (a, b) => a.stationSequence - b.stationSequence,
        );

        const data = {
            route: {
                id: model.id,
                agencyId: model.agencyId,
                routeNumber: model.routeNumber,
                routeName: model.routeName,
                routeNickname: model.routeNickname,
                routeDescription: model.routeDescription,
                routeType: model.routeType,
                routeUrl: model.routeUrl,
                routeColor: model.routeColor,
                routeTextColor: model.routeTextColor,
                createdAt: model.createdAt,
                updatedAt: model.updatedAt,
            },
            stations: sortedStations.map((rsl) => ({
                ...rsl.station,
                stationSequence: rsl.stationSequence,
                stationNumbering: rsl.stationNumbering,
            })),
        };

        return plainToClass(RouteStationsDto, data, transformerOptions);
    },
} as const;
```

- [ ] **Step 3: `route.query.ts` を置換**

- import: `buildRouteDetailsDto` 削除。`RouteDtoBuilder` / `RoutesDtoBuilder` を `'../builders/route.dto.builder'` から、`RouteStationsDtoBuilder` を `'../builders/route-stations.dto.builder'` から import。
- 行 30: `models.map((o) => buildRouteDetailsDto(o))` → `RoutesDtoBuilder.buildFromModel(models)`。
- 行 32: `models.data.map((o) => buildRouteDetailsDto(o))` → `RoutesDtoBuilder.buildFromModel(models.data)`。
- 行 47: `buildRouteDetailsDto(model)` → `RouteDtoBuilder.buildFromModel(model)`。
- 行 64: `RouteDtoBuilder.toStationsDto(model)` → `RouteStationsDtoBuilder.buildFromModel(model)`。
- 行 87: `models.map((m) => buildRouteDetailsDto(m))` → `RoutesDtoBuilder.buildFromModel(models)`。

- [ ] **Step 4: ビルド・lint・コミット**

Run: `npm run build && npm run lint`
Expected: `grep -rn "buildRouteDetailsDto\|toStationsDto" src/libs` がゼロ。
```bash
git add -A
git commit -m "refactor: :recycle: 路線 Builder を集約し RouteStations を別 Builder に分離する"
```

---

## Task 11: service（standalone 集約・`ServiceRoutesDtoBuilder` 分離・複数形・ファイル名）

**注意:** `service.query.ts` の station 参照は Task 7 で更新済み。本タスクでは service 自身の Builder のみ扱う。`ServiceAgenciesDtoBuilder`（別ファイル `service-agencies.dto.builder.ts`）は既に統一形なので変更不要。

**Files:**
- Modify → rename: `src/libs/service/infrastructure/builders/service-dto.builder.ts` → `service.dto.builder.ts`
- Create: `src/libs/service/infrastructure/builders/service-routes.dto.builder.ts`
- Modify（呼び出し側）: `src/libs/service/infrastructure/queries/service.query.ts`

- [ ] **Step 1: `service.dto.builder.ts` を最終形に（Details 用のみ）**

```bash
git mv src/libs/service/infrastructure/builders/service-dto.builder.ts \
       src/libs/service/infrastructure/builders/service.dto.builder.ts
```
内容（standalone → `ServiceDtoBuilder`/`ServicesDtoBuilder`、`toRoutesDto` は別ファイルへ）:
```ts
import { plainToClass } from 'class-transformer';
import { transformerOptions } from 'src/core/configs/transformer-options';
import { ServiceDetailsDto } from '../../usecase/dtos/service-details.dto';
import { ServiceModel } from '../models/service.model';

export const ServiceDtoBuilder = {
    buildFromModel: (model: ServiceModel): ServiceDetailsDto => {
        return plainToClass(ServiceDetailsDto, model, transformerOptions);
    },
} as const;

export const ServicesDtoBuilder = {
    buildFromModel: (models: ServiceModel[]): ServiceDetailsDto[] => {
        return models.map((model) => ServiceDtoBuilder.buildFromModel(model));
    },
} as const;
```

- [ ] **Step 2: `service-routes.dto.builder.ts` を新設（`toRoutesDto` を `buildFromModel` 化して移設）**

```ts
import { plainToClass } from 'class-transformer';
import { transformerOptions } from 'src/core/configs/transformer-options';
import { ServiceRoutesDto } from '../../usecase/dtos/service-routes.dto';
import { ServiceModel } from '../models/service.model';

export const ServiceRoutesDtoBuilder = {
    buildFromModel: (model: ServiceModel): ServiceRoutesDto => {
        // operating_systems を sequence 順にソートして routes を構築する
        const sortedOperatingSystems = [...(model.operatingSystems ?? [])].sort(
            (a, b) => a.sequence - b.sequence,
        );

        const data = {
            service: {
                id: model.id,
                serviceName: model.serviceName,
                serviceDescription: model.serviceDescription,
                createdAt: model.createdAt,
                updatedAt: model.updatedAt,
            },
            routes: sortedOperatingSystems.map((os) => ({
                ...os.route,
                sequence: os.sequence,
                startRouteStationListId: os.startRouteStationListId,
                endRouteStationListId: os.endRouteStationListId,
            })),
        };

        return plainToClass(ServiceRoutesDto, data, transformerOptions);
    },
} as const;
```

- [ ] **Step 3: `service.query.ts` を置換**

- import: `buildServiceDetailsDto` 削除。`ServiceDtoBuilder` / `ServicesDtoBuilder` を `'../builders/service.dto.builder'` から、`ServiceRoutesDtoBuilder` を `'../builders/service-routes.dto.builder'` から import。`ServiceAgenciesDtoBuilder`（既存 import）と `StationsDtoBuilder`（Task 7 で追加済み）はそのまま。
- 行 41: `models.map((o) => buildServiceDetailsDto(o))` → `ServicesDtoBuilder.buildFromModel(models)`。
- 行 43: `models.data.map((o) => buildServiceDetailsDto(o))` → `ServicesDtoBuilder.buildFromModel(models.data)`。
- 行 58: `buildServiceDetailsDto(model)` → `ServiceDtoBuilder.buildFromModel(model)`。
- 行 114: `ServiceDtoBuilder.toRoutesDto(model)` → `ServiceRoutesDtoBuilder.buildFromModel(model)`。
- 行 131: `models.map((m) => buildServiceDetailsDto(m))` → `ServicesDtoBuilder.buildFromModel(models)`。
- 行 97: `ServiceAgenciesDtoBuilder.buildFromModel(model)` は変更なし。

- [ ] **Step 4: ビルド・lint・コミット**

Run: `npm run build && npm run lint`
Expected: `grep -rn "buildServiceDetailsDto\|toRoutesDto" src/libs` がゼロ。
```bash
git add -A
git commit -m "refactor: :recycle: サービス Builder を集約し ServiceRoutes を別 Builder に分離する"
```

---

## Task 12: vehicle-formation のデッドコード削除

**根拠:** `buildVehicleFormationDetailsDto` は定義のみで使用箇所ゼロ（`grep -rn "buildVehicleFormationDetailsDto\|VehicleFormationDtoBuilder" src/libs | grep -v builders/` が空）。揺れ統一の方針（standalone 全廃）に従い削除する。

- [ ] **Step 1: 未使用であることを再確認**

Run:
```bash
cd /home/seapolis/Projects/sotetsu-lab-v3/sotetsu-lab-v3-api
grep -rn "buildVehicleFormationDetailsDto\|VehicleFormationDtoBuilder" src/ test/ | grep -v "builders/vehicle-formation"
```
Expected: 出力ゼロ。1 件でも出たら削除せず、その呼び出し側を Task 6 と同形（`VehicleFormationDtoBuilder` 新設）に変換する方針へ切り替える。

- [ ] **Step 2: ファイル削除**

Run:
```bash
git rm src/libs/formation/infrastructure/builders/vehicle-formation-dto.builder.ts
```

- [ ] **Step 3: ビルド・lint・コミット**

Run: `npm run build && npm run lint`
Expected: エラー 0。
```bash
git add -A
git commit -m "refactor: :recycle: 未使用の車両編成 standalone Builder を削除する"
```

---

## Task 13: 全体検証

- [ ] **Step 1: 揺れが残っていないことを一括確認**

Run:
```bash
cd /home/seapolis/Projects/sotetsu-lab-v3/sotetsu-lab-v3-api
echo "--- 廃止メソッド名の残存（すべてゼロが期待値） ---"
grep -rn "buildBy\(Details\|Create\|Replace\)Dto\|toDetailsDto\|toDetailsDtos\|toStationsDto\|toRoutesDto\|buildFromModels\|buildFromDomains\|Bulder" src/libs --include="*.ts"
echo "--- standalone build*DetailsDto 関数定義の残存（すべてゼロが期待値） ---"
grep -rn "export function build[A-Z][A-Za-z]*DetailsDto" src/libs --include="*.ts"
echo "--- ハイフン区切りの builder ファイル名残存（すべてゼロが期待値） ---"
find src/libs -name "*-dto.builder.ts" -o -name "*-model.builder.ts"
echo "--- as const 欠落 builder（すべてゼロが期待値） ---"
for f in $(find src/libs -name "*.builder.ts"); do grep -q "as const" "$f" || echo "$f"; done
```
Expected: すべて出力ゼロ。

- [ ] **Step 2: フルビルド**

Run: `npm run build`
Expected: エラー 0。

- [ ] **Step 3: lint**

Run: `npm run lint`
Expected: エラー 0。

- [ ] **Step 4: ユニットテスト**

Run: `npm run test`
Expected: 全パス。`formationId`/`operationId` を検証している既存テストがあれば、欠落バグ修正により値が入る前提に更新が必要かを確認する。

- [ ] **Step 5: E2E テスト**

Run: `npm run test:e2e`
Expected: 全パス。formation/operation の該当エンドポイントのレスポンスに `formationId`/`operationId` が含まれるようになる点に留意（バグ修正による意図的変化）。

- [ ] **Step 6: ブランチ整理**

すべて緑であることを確認したら、superpowers:finishing-a-development-branch に従って PR 作成またはマージ方針をユーザーに確認する。
```

