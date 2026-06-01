# operation_sighting_latest_caches 実装プラン（改訂版）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `operation_sighting_latest_caches` テーブルを導入し、time-cross-section エンドポイントの読み込みを2クエリ以内に削減する。

**Architecture:** `OperationSightingLatestCache` は `OperationSighting` とは独立した集約ルートとして管理する。キャッシュは編成単位（`formationNumber` UNIQUE）で「各編成の最新有効目撃へのポインタ」を保持する。書き込みは `DataSource.transaction()` で `OperationSightingCommand` と `OperationSightingLatestCacheCommand` をアトミックに実行する。読み込みは TypeORM QueryBuilder で `operation_sighting_latest_caches` と `operation_sightings` を JOIN して `sightingTime` を取得する（`formationNumber` UNIQUE のため DISTINCT ON 不要）。

**Tech Stack:** NestJS 10 / TypeORM 0.3 / PostgreSQL / dayjs

---

## ファイルマップ

| 操作 | ファイル |
|------|---------|
| Create | `src/libs/operation-sighting/domain/operation-sighting-latest-cache.domain.ts` |
| Create | `src/libs/operation-sighting/infrastructure/models/operation-sighting-latest-cache.model.ts` |
| Create | `src/libs/operation-sighting/infrastructure/builders/operation-sighting-latest-cache.model.builder.ts` |
| Create | `src/libs/operation-sighting/infrastructure/command/operation-sighting-latest-cache.command.ts` |
| Create | `src/libs/operation-sighting/infrastructure/query/operation-sighting-latest-cache.query.ts` |
| Modify | `src/libs/operation-sighting/infrastructure/builders/operation-sighting.model.builder.ts` |
| Modify | `src/libs/operation-sighting/domain/operation-sighting.domain.ts` |
| Modify | `src/libs/operation-sighting/usecase/builders/operation-sighting.domain.builder.ts` |
| Modify | `src/libs/operation-sighting/infrastructure/query/operation-sighting.query.ts` |
| Modify | `src/libs/operation-sighting/operation-sighting.libs.module.ts` |
| Modify | `src/libs/operation-sighting/usecase/operation-sighting.v3.service.ts` |
| Create | `src/libs/operation-sighting/usecase/operation-sighting.v3.service.spec.ts` |
| Auto-generate | `src/migrations/YYYYMMDDHHMMSS-AddOperationSightingLatestCaches.ts` |

---

## Task 1: `OperationSightingLatestCacheModel` エンティティ作成

**Files:**
- Create: `src/libs/operation-sighting/infrastructure/models/operation-sighting-latest-cache.model.ts`

**設計メモ:**
- `sightingTime` は持たない（JOIN で `operation_sightings.sighting_time` を参照する）
- `formationNumber` を UNIQUE インデックスとする（1編成=1キャッシュ行）
- `OperationSightingModel` との関係は `@ManyToOne` + `@JoinColumn`（cascade なし）
- `OperationSightingModel` 側には何も追加しない

- [ ] **Step 1: ファイルを作成する**

```typescript
import {
    Column,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { OperationSightingModel } from './operation-sighting.model';

@Entity({ name: 'operation_sighting_latest_caches' })
@Index(['formationNumber'], { unique: true })
@Index(['operationNumber'])
export class OperationSightingLatestCacheModel {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'text' })
    formationNumber: string;

    @Column({ type: 'uuid' })
    operationSightingId: string;

    @Column({ type: 'text' })
    operationNumber: string;

    @ManyToOne(() => OperationSightingModel)
    @JoinColumn({ name: 'operation_sighting_id' })
    readonly operationSighting?: OperationSightingModel;
}
```

- [ ] **Step 2: ビルドが通ることを確認する**

```bash
npm run build
```

Expected: エラーなし

---

## Task 2: `OperationSightingLatestCache` ドメインエンティティ作成

**Files:**
- Create: `src/libs/operation-sighting/domain/operation-sighting-latest-cache.domain.ts`

`OperationSightingInvalidation` と同じパターンで `Entity<Props>` を継承する。

- [ ] **Step 1: ファイルを作成する**

```typescript
import { Entity } from 'src/core/classes/entity';
import { UniqueEntityId } from 'src/core/classes/unique-entity-id';

type OperationSightingLatestCacheProps = {
    operationSightingId: string;
    operationNumber: string;
    formationNumber: string;
};

export class OperationSightingLatestCache extends Entity<OperationSightingLatestCacheProps> {
    private constructor(
        props: OperationSightingLatestCacheProps,
        id?: UniqueEntityId,
    ) {
        super(props, id);
    }

    static create(
        props: OperationSightingLatestCacheProps,
        id?: UniqueEntityId,
    ): OperationSightingLatestCache {
        return new OperationSightingLatestCache(props, id);
    }
}
```

- [ ] **Step 2: ビルドが通ることを確認する**

```bash
npm run build
```

---

## Task 3: ドメイン・ビルダー更新

**Files:**
- Modify: `src/libs/operation-sighting/domain/operation-sighting.domain.ts`
- Modify: `src/libs/operation-sighting/usecase/builders/operation-sighting.domain.builder.ts`
- Create: `src/libs/operation-sighting/infrastructure/builders/operation-sighting-latest-cache.model.builder.ts`
- Modify: `src/libs/operation-sighting/infrastructure/builders/operation-sighting.model.builder.ts`

### 3-1: `OperationSighting` ドメイン更新

`operation-sighting.domain.ts` を以下のように更新する:

- [ ] **Step 1: `OperationSightingProps` から `latestCache` を除去し、`setLatestCache` を削除する**

`operation-sighting.domain.ts` の `OperationSightingProps` を以下の通り更新する（`latestCache` を含まない形に戻す）:

```typescript
import { AggregatedRoot } from 'src/core/classes/aggregated-root';
import { UniqueEntityId } from 'src/core/classes/unique-entity-id';
import { OperationSightingInvalidation } from 'src/libs/operation-sighting/domain/operation-sighting-invalidation.domain';
import {
    OperationSightingManagementLog,
    OperationSightingManagementLogs,
} from './operation-sighting-management-log.domain';

type OperationSightingProps = {
    formationId: string;
    operationId: string;
    sightingTime: Date;
    invalidation: OperationSightingInvalidation | null;
    managementLogs: OperationSightingManagementLogs;
};

export class OperationSighting extends AggregatedRoot<OperationSightingProps> {
    private constructor(props: OperationSightingProps, id?: UniqueEntityId) {
        super(props, id);
    }

    static create(
        props: OperationSightingProps,
        id?: UniqueEntityId,
    ): OperationSighting {
        return new OperationSighting(props, id);
    }

    public update(props: Partial<OperationSightingProps>): void {
        for (const key of Object.keys(props)) {
            this.props[key] = props[key];
        }
    }

    invalidate(userId: string, reason: string): void {
        if (this.props.invalidation !== null) {
            throw new Error('Operation sighting is already invalidated.');
        }

        this.props.invalidation = OperationSightingInvalidation.create({
            operationSightingId: this.id.value,
        });
        this.props.managementLogs.add(
            OperationSightingManagementLog.create({
                operationSightingId: this.id.value,
                action: 'invalidation',
                userId,
                reason,
            }),
        );
    }

    restore(userId: string, reason: string): void {
        if (this.props.invalidation === null) {
            throw new Error('Operation sighting is not invalidated.');
        }

        this.props.invalidation = null;
        this.props.managementLogs.add(
            OperationSightingManagementLog.create({
                operationSightingId: this.id.value,
                action: 'restoration',
                userId,
                reason,
            }),
        );
    }

    isInvalid(): boolean {
        return !!this.props.invalidation;
    }
}
```

- [ ] **Step 2: `OperationSightingDomainBuilder` を更新する**

`operation-sighting.domain.builder.ts` の `buildByDetailsDto` は `dto.latestCache` から復元し、`buildByCreateDto` は `null` のまま（`post()` で `setLatestCache()` を呼ぶ）:

```typescript
buildByDetailsDto: (dto: OperationSightingDetailsDto): OperationSighting => {
    return OperationSighting.create(
        {
            formationId: dto.formationId,
            operationId: dto.operationId,
            sightingTime: dto.sightingTime,
            invalidation: dto.invalidation
                ? OperationSightingInvalidation.create(...)
                : null,
            managementLogs: OperationSightingManagementLogs.create(...),
        },
        new UniqueEntityId(dto.operationSightingId),
    );
},
buildByCreateDto: (dto: CreateOperationSightingDto): OperationSighting => {
    return OperationSighting.create({
        formationId: dto.formationId,
        operationId: dto.operationId,
        sightingTime: dto.sightingTime,
        invalidation: null,
        managementLogs: OperationSightingManagementLogs.create([]),
    });
},
```

- [ ] **Step 3: `OperationSightingLatestCacheModelBuilder` を作成する**

`src/libs/operation-sighting/infrastructure/builders/operation-sighting-latest-cache.model.builder.ts`:

```typescript
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
```

- [ ] **Step 4: `OperationSightingModelBuilder` に `latestCache` を追加する**

`operation-sighting.model.builder.ts` の `buildFromDomain` を更新:

```typescript
import { OperationSightingLatestCacheModelBuilder } from './operation-sighting-latest-cache.model.builder';

export const OperationSightingModelBuilder = {
    buildFromDomain: (domain: OperationSighting): OperationSightingModel => {
        return {
            id: domain.id.value,
            formationId: domain.props.formationId,
            operationId: domain.props.operationId,
            sightingTime: domain.props.sightingTime,
            invalidations: domain.props.invalidation
                ? [
                      OperationSightingInvalidationModelBuilder.buildFromDomain(
                          domain.props.invalidation,
                      ),
                  ]
                : [],
            managementLogs: domain.props.managementLogs
                .getItems()
                .map((log) =>
                    OperationSightingManagementLogModelBuilder.buildFromDomain(log),
                ),
        };
    },
} as const;
```

- [ ] **Step 5: ビルドが通ることを確認する**

```bash
npm run build
```

---

## Task 4: Libs モジュールに登録

**Files:**
- Modify: `src/libs/operation-sighting/operation-sighting.libs.module.ts`

- [ ] **Step 1: モデル・Query を登録する**

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OperationSightingCommand } from './infrastructure/command/operation-sighting.command';
import { OperationSightingLatestCacheCommand } from './infrastructure/command/operation-sighting-latest-cache.command';
import { OperationSightingInvalidationModel } from './infrastructure/models/operation-sighting-invalidation.model';
import { OperationSightingLatestCacheModel } from './infrastructure/models/operation-sighting-latest-cache.model';
import { OperationSightingManagementLogModel } from './infrastructure/models/operation-sighting-management-log.model';
import { OperationSightingModel } from './infrastructure/models/operation-sighting.model';
import { OperationSightingLatestCacheQuery } from './infrastructure/query/operation-sighting-latest-cache.query';
import { OperationSightingQuery } from './infrastructure/query/operation-sighting.query';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            OperationSightingModel,
            OperationSightingInvalidationModel,
            OperationSightingManagementLogModel,
            OperationSightingLatestCacheModel,
        ]),
    ],
    exports: [
        OperationSightingCommand,
        OperationSightingLatestCacheCommand,
        OperationSightingLatestCacheQuery,
        OperationSightingQuery,
    ],
    providers: [
        OperationSightingCommand,
        OperationSightingLatestCacheCommand,
        OperationSightingLatestCacheQuery,
        OperationSightingQuery,
    ],
})
export class OperationSightingLibsModule {}
```

- [ ] **Step 2: ビルドが通ることを確認する（空ファイルがあれば OK）**

```bash
npm run build
```

---

## Task 5: マイグレーション生成

**前提:** `.env.local` が設定されており、DBに接続できる状態であること。

- [ ] **Step 1: TypeORM CLI でマイグレーションを自動生成する**

```bash
npm run migration:generate -- src/migrations/AddOperationSightingLatestCaches
```

Expected: `src/migrations/YYYYMMDDHHMMSS-AddOperationSightingLatestCaches.ts` が生成される

- [ ] **Step 2: 生成されたマイグレーションを確認する**

生成ファイルを開き、以下の内容が含まれていることを確認する:
- `CREATE TABLE "operation_sighting_latest_caches"` の `up` メソッド
- 列: `id uuid PK`, `operation_sighting_id uuid`, `operation_number text`, `formation_number text`
- FK: `operation_sighting_id → operation_sightings(id)`
- インデックス: `(formation_number) UNIQUE`, `(operation_number)`

- [ ] **Step 3: マイグレーションを実行する**

```bash
npm run migration:run
```

---

## Task 6: `OperationSightingLatestCacheQuery` を新規作成

**Files:**
- Create: `src/libs/operation-sighting/infrastructure/query/operation-sighting-latest-cache.query.ts`

`formationNumber` UNIQUE のため DISTINCT ON は不要。QueryBuilder で `operation_sighting_latest_caches` と `operation_sightings` を JOIN して `sightingTime` を取得する。

- [ ] **Step 1: ファイルを作成する**

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as dayjs from 'dayjs';
import { Repository } from 'typeorm';
import { OperationSightingLatestCacheModel } from '../models/operation-sighting-latest-cache.model';

export type CacheQueryRow = {
    id: string;
    operationSightingId: string;
    operationNumber: string;
    formationNumber: string;
    sightingTime: string;
};

@Injectable()
export class OperationSightingLatestCacheQuery {
    constructor(
        @InjectRepository(OperationSightingLatestCacheModel)
        private readonly repository: Repository<OperationSightingLatestCacheModel>,
    ) {}

    async findOneByFormationNumber(params: {
        formationNumber: string;
    }): Promise<CacheQueryRow | null> {
        const { formationNumber } = params;

        const result = await this.repository
            .createQueryBuilder('cache')
            .innerJoin('cache.operationSighting', 'sighting')
            .select('cache.id', 'id')
            .addSelect('cache.operationSightingId', 'operationSightingId')
            .addSelect('cache.operationNumber', 'operationNumber')
            .addSelect('cache.formationNumber', 'formationNumber')
            .addSelect('sighting.sightingTime', 'sightingTime')
            .where('cache.formationNumber = :formationNumber', { formationNumber })
            .getRawOne<CacheQueryRow>();

        return result ?? null;
    }

    async findManyLatestGroupByFormationByOperationNumbers(params: {
        operationNumbers: string[];
        afterTime: dayjs.Dayjs;
        beforeTime: dayjs.Dayjs;
    }): Promise<CacheQueryRow[]> {
        const { operationNumbers, afterTime, beforeTime } = params;
        if (operationNumbers.length === 0) return [];

        return this.repository
            .createQueryBuilder('cache')
            .innerJoin('cache.operationSighting', 'sighting')
            .select('cache.id', 'id')
            .addSelect('cache.operationSightingId', 'operationSightingId')
            .addSelect('cache.operationNumber', 'operationNumber')
            .addSelect('cache.formationNumber', 'formationNumber')
            .addSelect('sighting.sightingTime', 'sightingTime')
            .where('cache.operationNumber IN (:...operationNumbers)', { operationNumbers })
            .andWhere('sighting.sightingTime >= :afterTime', { afterTime: afterTime.toDate() })
            .andWhere('sighting.sightingTime <= :beforeTime', { beforeTime: beforeTime.toDate() })
            .getRawMany<CacheQueryRow>();
    }

    async findManyLatestGroupByFormationByFormationNumbers(params: {
        formationNumbers: string[];
        beforeTime: dayjs.Dayjs;
    }): Promise<CacheQueryRow[]> {
        const { formationNumbers, beforeTime } = params;
        if (formationNumbers.length === 0) return [];

        return this.repository
            .createQueryBuilder('cache')
            .innerJoin('cache.operationSighting', 'sighting')
            .select('cache.id', 'id')
            .addSelect('cache.operationSightingId', 'operationSightingId')
            .addSelect('cache.operationNumber', 'operationNumber')
            .addSelect('cache.formationNumber', 'formationNumber')
            .addSelect('sighting.sightingTime', 'sightingTime')
            .where('cache.formationNumber IN (:...formationNumbers)', { formationNumbers })
            .andWhere('sighting.sightingTime <= :beforeTime', { beforeTime: beforeTime.toDate() })
            .getRawMany<CacheQueryRow>();
    }

    async findManyByOperationNumbers(params: {
        operationNumbers: string[];
        afterTime: dayjs.Dayjs;
        beforeTime: dayjs.Dayjs;
    }): Promise<CacheQueryRow[]> {
        const { operationNumbers, afterTime, beforeTime } = params;
        if (operationNumbers.length === 0) return [];

        return this.repository
            .createQueryBuilder('cache')
            .innerJoin('cache.operationSighting', 'sighting')
            .select('cache.id', 'id')
            .addSelect('cache.operationSightingId', 'operationSightingId')
            .addSelect('cache.operationNumber', 'operationNumber')
            .addSelect('cache.formationNumber', 'formationNumber')
            .addSelect('sighting.sightingTime', 'sightingTime')
            .where('cache.operationNumber IN (:...operationNumbers)', { operationNumbers })
            .andWhere('sighting.sightingTime > :afterTime', { afterTime: afterTime.toDate() })
            .andWhere('sighting.sightingTime <= :beforeTime', { beforeTime: beforeTime.toDate() })
            .getRawMany<CacheQueryRow>();
    }
}
```

- [ ] **Step 2: ビルドが通ることを確認する**

```bash
npm run build
```

---

## Task 7: 書き込み側の統合（post / invalidate / restore）

**Files:**
- Create: `src/libs/operation-sighting/infrastructure/command/operation-sighting-latest-cache.command.ts`
- Modify: `src/libs/operation-sighting/infrastructure/command/operation-sighting.command.ts`
- Modify: `src/libs/operation-sighting/usecase/operation-sighting.v3.service.ts`
- Create: `src/libs/operation-sighting/usecase/operation-sighting.v3.service.spec.ts`

`OperationSightingLatestCache` は独立集約のため cascade なし。`DataSource.transaction()` で sighting 保存と cache 操作をアトミックに実行する。

### 7-0: コマンドファイルの作成・更新

- [ ] **Step 1: `OperationSightingLatestCacheCommand` を作成する**

`src/libs/operation-sighting/infrastructure/command/operation-sighting-latest-cache.command.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { OperationSightingLatestCache } from '../../domain/operation-sighting-latest-cache.domain';
import { OperationSightingLatestCacheModelBuilder } from '../builders/operation-sighting-latest-cache.model.builder';
import { OperationSightingLatestCacheModel } from '../models/operation-sighting-latest-cache.model';

@Injectable()
export class OperationSightingLatestCacheCommand {
    constructor(
        @InjectRepository(OperationSightingLatestCacheModel)
        private readonly repository: Repository<OperationSightingLatestCacheModel>,
    ) {}

    async save(
        domain: OperationSightingLatestCache,
        manager?: EntityManager,
    ): Promise<void> {
        const repo = manager
            ? manager.getRepository(OperationSightingLatestCacheModel)
            : this.repository;
        await repo.save(
            OperationSightingLatestCacheModelBuilder.buildFromDomain(domain),
        );
    }

    async deleteByFormationNumber(
        formationNumber: string,
        manager?: EntityManager,
    ): Promise<void> {
        const repo = manager
            ? manager.getRepository(OperationSightingLatestCacheModel)
            : this.repository;
        await repo.delete({ formationNumber });
    }
}
```

- [ ] **Step 2: `OperationSightingCommand.save` に `manager?` を追加する**

`operation-sighting.command.ts` の `save` シグネチャを更新する:

```typescript
import { EntityManager } from 'typeorm';

async save(
    domain: OperationSighting,
    manager?: EntityManager,
): Promise<OperationSightingDetailsDto> {
    const repo = manager
        ? manager.getRepository(OperationSightingModel)
        : this.operationSightingRepository;
    const model = OperationSightingModelBuilder.buildFromDomain(domain);
    const saved = await repo.save(model);
    return OperationSightingDtoBuilder.buildFromModel(saved);
}
```

- [ ] **Step 3: ビルドが通ることを確認する**

```bash
npm run build
```

### 7-1: 書き込みテストと実装

- [ ] **Step 4: 書き込み系のテストを書く（失敗することを確認する）**

`src/libs/operation-sighting/usecase/operation-sighting.v3.service.spec.ts` を新規作成する:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { OperationSightingV3Service } from './operation-sighting.v3.service';
import { OperationSightingCommand } from '../infrastructure/command/operation-sighting.command';
import { OperationSightingLatestCacheCommand } from '../infrastructure/command/operation-sighting-latest-cache.command';
import { OperationSightingLatestCacheQuery } from '../infrastructure/query/operation-sighting-latest-cache.query';
import { OperationSightingQuery } from '../infrastructure/query/operation-sighting.query';
import { CalendarQuery } from 'src/libs/calendar/infrastructure/queries/calendar.query';
import { FormationQuery } from 'src/libs/formation/infrastructure/queries/formation.query';
import { OperationQuery } from 'src/libs/operation/infrastructure/queries/operation.query';

const mockManager = {};
const mockSave = jest.fn();
const mockOperationSightingCommand = { save: mockSave };
const mockOperationSightingLatestCacheCommand = {
    save: jest.fn(),
    deleteByFormationNumber: jest.fn(),
};
const mockOperationSightingLatestCacheQuery = {
    findOneByFormationNumber: jest.fn(),
    findManyLatestGroupByFormationByOperationNumbers: jest.fn(),
    findManyLatestGroupByFormationByFormationNumbers: jest.fn(),
    findManyByOperationNumbers: jest.fn(),
};
const mockOperationSightingQuery = {
    findOneById: jest.fn(),
    findOneLatestByOperationNumberBeforeTime: jest.fn(),
    findOneLatestByFormationNumberBeforeTime: jest.fn(),
    findManyByOperationNumbersAndSightingTimeRange: jest.fn(),
};
const mockDataSource = {
    transaction: jest.fn().mockImplementation(async (fn) => fn(mockManager)),
};
const mockCalendarQuery = { findOneBySpecificDate: jest.fn() };
const mockFormationQuery = {
    findManyBySpecificPeriod: jest.fn(),
    findOneByAgencyIdAndFormationNumberAndDate: jest.fn(),
    findOneByAgencyIdAndVehicleNumberAndDate: jest.fn(),
};
const mockOperationQuery = {
    findOneByCalendarIdAndOperationNumber: jest.fn(),
    findOneFirstDepartureTimeByOperationIdAndDate: jest.fn(),
    findManyByCalendarId: jest.fn(),
};

async function buildService(): Promise<OperationSightingV3Service> {
    const module: TestingModule = await Test.createTestingModule({
        providers: [
            OperationSightingV3Service,
            { provide: DataSource, useValue: mockDataSource },
            { provide: OperationSightingCommand, useValue: mockOperationSightingCommand },
            { provide: OperationSightingLatestCacheCommand, useValue: mockOperationSightingLatestCacheCommand },
            { provide: OperationSightingLatestCacheQuery, useValue: mockOperationSightingLatestCacheQuery },
            { provide: OperationSightingQuery, useValue: mockOperationSightingQuery },
            { provide: CalendarQuery, useValue: mockCalendarQuery },
            { provide: FormationQuery, useValue: mockFormationQuery },
            { provide: OperationQuery, useValue: mockOperationQuery },
        ],
    }).compile();
    return module.get(OperationSightingV3Service);
}

describe('OperationSightingV3Service - write side cache', () => {
    let service: OperationSightingV3Service;

    beforeEach(async () => {
        jest.clearAllMocks();
        mockDataSource.transaction.mockImplementation(async (fn) => fn(mockManager));
        service = await buildService();
    });

    it('invalidate: キャッシュターゲットかつ前の有効目撃がない場合、cache が削除される', async () => {
        const sightingId = 'sighting-uuid';
        const dto = {
            operationSightingId: sightingId,
            formationId: 'f-id',
            operationId: 'o-id',
            sightingTime: new Date('2026-05-01T10:00:00+09:00'),
            operation: { operationNumber: '61' },
            formation: { formationNumber: '8001' },
            invalidation: null,
            managementLogs: [],
        };
        mockOperationSightingQuery.findOneById.mockResolvedValue(dto);
        mockOperationSightingLatestCacheQuery.findOneByFormationNumber.mockResolvedValue({
            id: 'cache-uuid',
            operationSightingId: sightingId,
            operationNumber: '61',
            formationNumber: '8001',
            sightingTime: '2026-05-01T10:00:00+09:00',
        });
        mockOperationSightingQuery.findOneLatestByFormationNumberBeforeTime.mockResolvedValue(null);
        mockSave.mockResolvedValue({ operationSightingId: sightingId });

        await service.invalidate({ operationSightingId: sightingId, userId: 'u1', reason: 'test' });

        expect(mockOperationSightingLatestCacheCommand.deleteByFormationNumber)
            .toHaveBeenCalledWith('8001', mockManager);
        expect(mockOperationSightingLatestCacheCommand.save).not.toHaveBeenCalled();
    });

    it('invalidate: キャッシュターゲットかつ前の有効目撃がある場合、cache が付け替えられる', async () => {
        const sightingId = 'sighting-uuid';
        const dto = {
            operationSightingId: sightingId,
            formationId: 'f-id',
            operationId: 'o-id',
            sightingTime: new Date('2026-05-02T10:00:00+09:00'),
            operation: { operationNumber: '61' },
            formation: { formationNumber: '8001' },
            invalidation: null,
            managementLogs: [],
        };
        const prevSighting = {
            operationSightingId: 'sighting-prev',
            operation: { operationNumber: '61' },
            formation: { formationNumber: '8001' },
            sightingTime: new Date('2026-05-01T10:00:00+09:00'),
        };
        mockOperationSightingQuery.findOneById.mockResolvedValue(dto);
        mockOperationSightingLatestCacheQuery.findOneByFormationNumber.mockResolvedValue({
            id: 'cache-uuid',
            operationSightingId: sightingId,
            operationNumber: '61',
            formationNumber: '8001',
            sightingTime: '2026-05-02T10:00:00+09:00',
        });
        mockOperationSightingQuery.findOneLatestByFormationNumberBeforeTime.mockResolvedValue(prevSighting);
        mockSave.mockResolvedValue({ operationSightingId: sightingId });

        await service.invalidate({ operationSightingId: sightingId, userId: 'u1', reason: 'test' });

        expect(mockOperationSightingLatestCacheCommand.save).toHaveBeenCalled();
        const savedCache = mockOperationSightingLatestCacheCommand.save.mock.calls[0][0];
        expect(savedCache.props.operationSightingId).toBe('sighting-prev');
        expect(mockOperationSightingLatestCacheCommand.deleteByFormationNumber).not.toHaveBeenCalled();
    });

    it('invalidate: キャッシュターゲットでない場合、cache は変更されない', async () => {
        const sightingId = 'sighting-old';
        const dto = {
            operationSightingId: sightingId,
            formationId: 'f-id',
            operationId: 'o-id',
            sightingTime: new Date('2026-04-30T10:00:00+09:00'),
            operation: { operationNumber: '61' },
            formation: { formationNumber: '8001' },
            invalidation: null,
            managementLogs: [],
        };
        mockOperationSightingQuery.findOneById.mockResolvedValue(dto);
        mockOperationSightingLatestCacheQuery.findOneByFormationNumber.mockResolvedValue({
            id: 'cache-uuid',
            operationSightingId: 'sighting-newer',
            operationNumber: '62',
            formationNumber: '8001',
            sightingTime: '2026-05-01T10:00:00+09:00',
        });
        mockSave.mockResolvedValue({ operationSightingId: sightingId });

        await service.invalidate({ operationSightingId: sightingId, userId: 'u1', reason: 'test' });

        expect(mockOperationSightingLatestCacheCommand.save).not.toHaveBeenCalled();
        expect(mockOperationSightingLatestCacheCommand.deleteByFormationNumber).not.toHaveBeenCalled();
    });

    it('restore: 現在のキャッシュより新しい場合、cache が更新される', async () => {
        const sightingId = 'sighting-uuid';
        const dto = {
            operationSightingId: sightingId,
            formationId: 'f-id',
            operationId: 'o-id',
            sightingTime: new Date('2026-05-02T10:00:00+09:00'),
            operation: { operationNumber: '62' },
            formation: { formationNumber: '8001' },
            invalidation: { operationSightingId: sightingId, operationSightingInvalidationId: 'inv-id' },
            managementLogs: [],
        };
        mockOperationSightingQuery.findOneById.mockResolvedValue(dto);
        mockOperationSightingLatestCacheQuery.findOneByFormationNumber.mockResolvedValue({
            id: 'cache-uuid',
            operationSightingId: 'sighting-older',
            operationNumber: '61',
            formationNumber: '8001',
            sightingTime: '2026-05-01T10:00:00+09:00',
        });
        mockSave.mockResolvedValue({ operationSightingId: sightingId });

        await service.restore({ operationSightingId: sightingId, userId: 'u1', reason: 'test' });

        expect(mockOperationSightingLatestCacheCommand.save).toHaveBeenCalled();
        const savedCache = mockOperationSightingLatestCacheCommand.save.mock.calls[0][0];
        expect(savedCache.props.operationSightingId).toBe(sightingId);
        expect(savedCache.props.operationNumber).toBe('62');
    });
});
```

- [ ] **Step 5: テストが失敗することを確認する**

```bash
npm run test -- operation-sighting.v3.service --verbose
```

Expected: FAIL

- [ ] **Step 6: サービスの constructor と post/invalidate/restore を更新する**

`operation-sighting.v3.service.ts`:

```typescript
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { OperationSightingLatestCacheCommand } from '../infrastructure/command/operation-sighting-latest-cache.command';
import { OperationSightingLatestCacheQuery } from '../infrastructure/query/operation-sighting-latest-cache.query';
import { OperationSightingLatestCache } from '../domain/operation-sighting-latest-cache.domain';
import { UniqueEntityId } from 'src/core/classes/unique-entity-id';

constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly operationSightingCommand: OperationSightingCommand,
    private readonly operationSightingLatestCacheCommand: OperationSightingLatestCacheCommand,
    private readonly operationSightingLatestCacheQuery: OperationSightingLatestCacheQuery,
    private readonly operationSightingQuery: OperationSightingQuery,
    private readonly calendarQuery: CalendarQuery,
    private readonly operationQuery: OperationQuery,
    private readonly formationQuery: FormationQuery,
) {}
```

`post()` の `const result = await this.operationSightingCommand.save(domain);` を以下のトランザクションに置き換える:

```typescript
let result: OperationSightingDetailsDto;
await this.dataSource.transaction(async (manager) => {
    result = await this.operationSightingCommand.save(domain, manager);
    const cache = OperationSightingLatestCache.create({
        formationNumber: formation.formationNumber,
        operationSightingId: domain.id.value,
        operationNumber: operation.operationNumber,
    });
    await this.operationSightingLatestCacheCommand.save(cache, manager);
});
```

`invalidate()` の `const result = await this.operationSightingCommand.save(domain);` を以下に置き換える:

```typescript
const currentCache = await this.operationSightingLatestCacheQuery.findOneByFormationNumber({
    formationNumber: dto.formation.formationNumber,
});
const isTarget = currentCache?.operationSightingId === params.operationSightingId;
let prevSighting = null;
if (isTarget) {
    prevSighting = await this.operationSightingQuery.findOneLatestByFormationNumberBeforeTime({
        formationNumber: dto.formation.formationNumber,
        endTime: dayjs(dto.sightingTime).subtract(1, 'ms'),
    });
}

let result: OperationSightingDetailsDto;
await this.dataSource.transaction(async (manager) => {
    result = await this.operationSightingCommand.save(domain, manager);
    if (isTarget) {
        if (prevSighting) {
            await this.operationSightingLatestCacheCommand.save(
                OperationSightingLatestCache.create(
                    {
                        formationNumber: dto.formation.formationNumber,
                        operationSightingId: prevSighting.operationSightingId,
                        operationNumber: prevSighting.operation.operationNumber,
                    },
                    new UniqueEntityId(currentCache.id),
                ),
                manager,
            );
        } else {
            await this.operationSightingLatestCacheCommand.deleteByFormationNumber(
                dto.formation.formationNumber,
                manager,
            );
        }
    }
});
```

`restore()` の `const result = await this.operationSightingCommand.save(domain);` を以下に置き換える:

```typescript
const currentCache = await this.operationSightingLatestCacheQuery.findOneByFormationNumber({
    formationNumber: dto.formation.formationNumber,
});
const shouldUpdate =
    !currentCache ||
    dayjs(currentCache.sightingTime).isBefore(dayjs(dto.sightingTime));

let result: OperationSightingDetailsDto;
await this.dataSource.transaction(async (manager) => {
    result = await this.operationSightingCommand.save(domain, manager);
    if (shouldUpdate) {
        await this.operationSightingLatestCacheCommand.save(
            OperationSightingLatestCache.create(
                {
                    formationNumber: dto.formation.formationNumber,
                    operationSightingId: params.operationSightingId,
                    operationNumber: dto.operation.operationNumber,
                },
                currentCache ? new UniqueEntityId(currentCache.id) : undefined,
            ),
            manager,
        );
    }
});
```

- [ ] **Step 7: テストが通ることを確認する**

```bash
npm run test -- operation-sighting.v3.service --verbose
```

Expected: PASS

- [ ] **Step 8: コミット**

```bash
git add \
  src/libs/operation-sighting/domain/operation-sighting-latest-cache.domain.ts \
  src/libs/operation-sighting/domain/operation-sighting.domain.ts \
  src/libs/operation-sighting/infrastructure/models/operation-sighting-latest-cache.model.ts \
  src/libs/operation-sighting/infrastructure/builders/operation-sighting-latest-cache.model.builder.ts \
  src/libs/operation-sighting/infrastructure/builders/operation-sighting.model.builder.ts \
  src/libs/operation-sighting/infrastructure/command/operation-sighting-latest-cache.command.ts \
  src/libs/operation-sighting/infrastructure/command/operation-sighting.command.ts \
  src/libs/operation-sighting/infrastructure/query/operation-sighting-latest-cache.query.ts \
  src/libs/operation-sighting/usecase/builders/operation-sighting.domain.builder.ts \
  src/libs/operation-sighting/operation-sighting.libs.module.ts \
  src/libs/operation-sighting/usecase/operation-sighting.v3.service.ts \
  src/libs/operation-sighting/usecase/operation-sighting.v3.service.spec.ts
git commit -m "feat: :sparkles: operation_sighting_latest_caches を独立集約・トランザクション保護で実装する"
```

---

## Task 8: operation番号エンドポイントの読み込み側書き換え

**Files:**
- Modify: `src/libs/operation-sighting/usecase/operation-sighting.v3.service.ts`
- Modify: `src/libs/operation-sighting/usecase/operation-sighting.v3.service.spec.ts`

### アルゴリズム概要

1. `latestSighting`（opN の最新目撃）と `calendar`（改正日）を **parallel** 取得
2. `latestSighting` が null → `{ latestSighting: null, expectedSighting: null }` を返す
3. キャッシュから群メンバーの「編成ごと最新目撃」を取得（`findManyLatestGroupByFormationByOperationNumbers`）
4. 各エントリを `forward(op, today - railway_day(sightingTime))` で投影し、投影先 == opN の候補を抽出
5. 候補編成のグローバル最新が群内と同じか検証（`findManyLatestGroupByFormationByFormationNumbers`）→ 群を離れた編成を除外
6. 最も新しい有効候補の `formationNumber` を expected として `formations` テーブルから詳細を取得

- [ ] **Step 1: テストを追加する（失敗することを確認）**

`operation-sighting.v3.service.spec.ts` に以下を追記する:

```typescript
import dayjs from 'dayjs';

describe('findOneTimeCrossSectionByOperationNumber', () => {
    let service: OperationSightingV3Service;

    beforeEach(async () => {
        jest.clearAllMocks();
        service = await buildService();
    });

    it('latestSighting が null の場合は null/null を返す', async () => {
        mockOperationSightingQuery.findOneLatestByOperationNumberBeforeTime.mockResolvedValue(null);
        mockCalendarQuery.findOneBySpecificDate.mockResolvedValue({
            id: 'cal-1', startDate: '2026-03-13',
        });

        const result = await service.findOneTimeCrossSectionByOperationNumber({
            operationNumber: '61',
            searchTime: '2026-05-30T10:00:00+09:00',
        });

        expect(result).toEqual({ latestSighting: null, expectedSighting: null });
        expect(mockOperationSightingLatestCacheQuery.findManyLatestGroupByFormationByOperationNumbers).not.toHaveBeenCalled();
    });

    it('キャッシュから候補が見つかり前進投影が opN に一致する場合、その編成を expected として返す', async () => {
        // searchTime=2026-05-30 10:00 JST, today鉄道日=2026-05-30
        // キャッシュ: 63 が 2日前(2026-05-28 14:00)に編成 8001 で目撃
        // forward(63, 2) = 65 → searchOpN=65 にヒット
        const sightingTime = '2026-05-28T14:00:00.000+09:00';
        const latestSighting = {
            id: 'sighting-1',
            operation: { operationNumber: '65' },
            formation: { formationNumber: '7001' },
            sightingTime: '2026-05-29T10:00:00.000+09:00',
        };
        mockOperationSightingQuery.findOneLatestByOperationNumberBeforeTime.mockResolvedValue(latestSighting);
        mockCalendarQuery.findOneBySpecificDate.mockResolvedValue({ id: 'cal-1', startDate: '2026-03-13' });
        mockOperationSightingLatestCacheQuery.findManyLatestGroupByFormationByOperationNumbers.mockResolvedValue([
            {
                id: 'cache-1',
                operationNumber: '63',
                formationNumber: '8001',
                operationSightingId: 'sighting-2',
                sightingTime,
            },
        ]);
        mockOperationSightingLatestCacheQuery.findManyLatestGroupByFormationByFormationNumbers.mockResolvedValue([
            {
                id: 'cache-1',
                operationNumber: '63',
                formationNumber: '8001',
                operationSightingId: 'sighting-2',
                sightingTime,
            },
        ]);
        mockFormationQuery.findManyBySpecificPeriod.mockResolvedValue([
            { id: 'f-1', formationNumber: '8001' },
        ]);

        const result = await service.findOneTimeCrossSectionByOperationNumber({
            operationNumber: '65',
            searchTime: '2026-05-30T10:00:00+09:00',
        });

        expect(result.expectedSighting?.formation?.formationNumber).toBe('8001');
    });

    it('候補がグローバル最新と異なる（群を離れた編成）場合は formation を null で返す', async () => {
        const sightingTime = '2026-05-28T14:00:00.000+09:00';
        const latestSighting = {
            id: 'sighting-1',
            operation: { operationNumber: '65' },
            formation: { formationNumber: '7001' },
            sightingTime: '2026-05-29T10:00:00.000+09:00',
        };
        mockOperationSightingQuery.findOneLatestByOperationNumberBeforeTime.mockResolvedValue(latestSighting);
        mockCalendarQuery.findOneBySpecificDate.mockResolvedValue({ id: 'cal-1', startDate: '2026-03-13' });
        mockOperationSightingLatestCacheQuery.findManyLatestGroupByFormationByOperationNumbers.mockResolvedValue([
            { id: 'cache-1', operationNumber: '63', formationNumber: '8001', operationSightingId: 'sighting-2', sightingTime },
        ]);
        // グローバル最新は別の目撃（群外に移動済み）
        mockOperationSightingLatestCacheQuery.findManyLatestGroupByFormationByFormationNumbers.mockResolvedValue([
            {
                id: 'cache-2',
                operationNumber: '91G',
                formationNumber: '8001',
                operationSightingId: 'sighting-3',
                sightingTime: '2026-05-29T12:00:00.000+09:00',
            },
        ]);

        const result = await service.findOneTimeCrossSectionByOperationNumber({
            operationNumber: '65',
            searchTime: '2026-05-30T10:00:00+09:00',
        });

        expect(result.expectedSighting?.formation).toBeNull();
        expect(mockFormationQuery.findManyBySpecificPeriod).not.toHaveBeenCalled();
    });
});
```

- [ ] **Step 2: テストが失敗することを確認する**

```bash
npm run test -- operation-sighting.v3.service --verbose
```

- [ ] **Step 3: `forwardK` ヘルパーを追加し、`findOneTimeCrossSectionByOperationNumber` を書き換える**

ファイル末尾の `getGroupMembers` の後に `forwardK` を追加:

```typescript
function forwardK(operationNumber: string, k: number): string | undefined {
    let current = operationNumber;
    for (let i = 0; i < k; i++) {
        const next = operationNumberCirculateMap.get(current);
        if (!next) return undefined;
        current = next;
    }
    return current;
}
```

`findOneTimeCrossSectionByOperationNumber` を以下に書き換える:

```typescript
async findOneTimeCrossSectionByOperationNumber(params: {
    operationNumber: string;
    searchTime?: string;
}): Promise<OperationSightingTimeCrossSectionDto> {
    const { operationNumber, searchTime } = params;

    if (operationNumber === '100') {
        throw new UnprocessableEntityException(
            'Searching for suspended operation is not supported.',
        );
    }

    const searchTimeInstance = searchTime ? dayjs(searchTime) : dayjs();
    const today = getBaseDate(searchTimeInstance);

    const [latestSighting, calendar] = await Promise.all([
        this.operationSightingQuery.findOneLatestByOperationNumberBeforeTime({
            operationNumber,
            endTime: searchTimeInstance,
        }),
        this.calendarQuery.findOneBySpecificDate({
            date: today.format('YYYY-MM-DD'),
        }),
    ]);

    if (!latestSighting) {
        return { latestSighting: null, expectedSighting: null };
    }

    const reformDate = dayjs(calendar.startDate, 'YYYY-MM-DD');
    const groupMembers = getGroupMembers(
        operationNumber,
        operationNumberCirculateReverseMap,
    );

    const groupLatest =
        await this.operationSightingLatestCacheQuery.findManyLatestGroupByFormationByOperationNumbers({
            operationNumbers: groupMembers,
            afterTime: reformDate,
            beforeTime: searchTimeInstance,
        });

    const candidates = groupLatest.filter((row) => {
        const k = today.diff(
            getBaseDate(dayjs(row.sightingTime)),
            'day',
        );
        if (k < 0) return false;
        return forwardK(row.operationNumber, k) === operationNumber;
    });

    const startDate = today.format('YYYY-MM-DD');

    if (candidates.length === 0) {
        return {
            latestSighting,
            expectedSighting: {
                ...pick(latestSighting, ['operation']),
                formation: null,
            },
        };
    }

    const candidateFormations = [...new Set(candidates.map((c) => c.formationNumber))];
    const globalLatest =
        await this.operationSightingLatestCacheQuery.findManyLatestGroupByFormationByFormationNumbers({
            formationNumbers: candidateFormations,
            beforeTime: searchTimeInstance,
        });

    const validCandidates = candidates.filter((candidate) => {
        const global = globalLatest.find(
            (g) => g.formationNumber === candidate.formationNumber,
        );
        return (
            global &&
            global.operationSightingId === candidate.operationSightingId
        );
    });

    if (validCandidates.length === 0) {
        return {
            latestSighting,
            expectedSighting: {
                ...pick(latestSighting, ['operation']),
                formation: null,
            },
        };
    }

    const winner = validCandidates.sort(
        (a, b) =>
            dayjs(b.sightingTime).valueOf() - dayjs(a.sightingTime).valueOf(),
    )[0];

    const formations = await this.formationQuery.findManyBySpecificPeriod({
        startDate,
        endDate: startDate,
    });

    return {
        latestSighting,
        expectedSighting: {
            ...pick(latestSighting, ['operation']),
            formation:
                formations.find(
                    (f) => f.formationNumber === winner.formationNumber,
                ) ?? null,
        },
    };
}
```

- [ ] **Step 4: テストが通ることを確認する**

```bash
npm run test -- operation-sighting.v3.service --verbose
```

- [ ] **Step 5: ビルドが通ることを確認する**

```bash
npm run build
```

---

## Task 9: formation番号エンドポイントの読み込み側書き換え

**Files:**
- Modify: `src/libs/operation-sighting/usecase/operation-sighting.v3.service.ts`
- Modify: `src/libs/operation-sighting/usecase/operation-sighting.v3.service.spec.ts`

### アルゴリズム概要

1. `latestSighting`（編成の最新目撃）と `calendar`（改正日）を **parallel** 取得
2. 改正前の目撃 → `expectedSighting: null` で early return
3. 前進経路を計算: `[forward^1(op), ..., forward^k(op)]`（k = today - latestSighting の鉄道日）
4. k=0 → 当日目撃済み、変位チェックなし、latestSighting の運用をそのまま返す
5. k>0 → `findManyLatestGroupByOperationByOperationNumbers` でパス上に F 以外の目撃がないか確認（変位チェック）
6. 変位あり → `expectedSighting.operation: null`、なし → forward^k(op) を expected とする

- [ ] **Step 1: テストを追加する（失敗することを確認）**

`operation-sighting.v3.service.spec.ts` に以下を追記する:

```typescript
describe('findOneTimeCrossSectionByFormationNumber', () => {
    let service: OperationSightingV3Service;

    beforeEach(async () => {
        jest.clearAllMocks();
        service = await buildService();
    });

    it('latestSighting が null の場合は null/null を返す', async () => {
        mockOperationSightingQuery.findOneLatestByFormationNumberBeforeTime.mockResolvedValue(null);
        mockCalendarQuery.findOneBySpecificDate.mockResolvedValue({ id: 'cal-1', startDate: '2026-03-13' });

        const result = await service.findOneTimeCrossSectionByFormationNumber({
            formationNumber: '8001',
            searchTime: '2026-05-30T10:00:00+09:00',
        });

        expect(result).toEqual({ latestSighting: null, expectedSighting: null });
    });

    it('変位なしの場合、forward^k の運用を expected として返す', async () => {
        // 編成 8001 が 2日前(2026-05-28) に 63 で目撃
        // forward^2(63) = 65 → expected.operation = 65
        const latestSighting = {
            id: 'sighting-1',
            operation: { id: 'op-63', operationNumber: '63' },
            formation: { id: 'f-1', formationNumber: '8001' },
            sightingTime: '2026-05-28T14:00:00.000+09:00',
        };
        mockOperationSightingQuery.findOneLatestByFormationNumberBeforeTime.mockResolvedValue(latestSighting);
        mockCalendarQuery.findOneBySpecificDate.mockResolvedValue({ id: 'cal-1', startDate: '2026-03-13' });
        // パス [64, 65] に変位なし（結果空）
        mockOperationSightingLatestCacheQuery.findManyByOperationNumbers.mockResolvedValue([]);
        mockOperationQuery.findManyByCalendarId.mockResolvedValue([
            { id: 'op-64', operationNumber: '64' },
            { id: 'op-65', operationNumber: '65' },
        ]);

        const result = await service.findOneTimeCrossSectionByFormationNumber({
            formationNumber: '8001',
            searchTime: '2026-05-30T10:00:00+09:00',
        });

        expect(result.expectedSighting?.operation?.operationNumber).toBe('65');
    });

    it('パス上に別編成の目撃がある場合は operation を null で返す', async () => {
        const latestSighting = {
            id: 'sighting-1',
            operation: { id: 'op-63', operationNumber: '63' },
            formation: { id: 'f-1', formationNumber: '8001' },
            sightingTime: '2026-05-28T14:00:00.000+09:00',
        };
        mockOperationSightingQuery.findOneLatestByFormationNumberBeforeTime.mockResolvedValue(latestSighting);
        mockCalendarQuery.findOneBySpecificDate.mockResolvedValue({ id: 'cal-1', startDate: '2026-03-13' });
        // 64 に別編成が入っていた
        mockOperationSightingLatestCacheQuery.findManyByOperationNumbers.mockResolvedValue([
            {
                id: 'cache-x',
                operationNumber: '64',
                formationNumber: '9001',
                operationSightingId: 'sighting-x',
                sightingTime: '2026-05-29T10:00:00.000+09:00',
            },
        ]);

        const result = await service.findOneTimeCrossSectionByFormationNumber({
            formationNumber: '8001',
            searchTime: '2026-05-30T10:00:00+09:00',
        });

        expect(result.expectedSighting?.operation).toBeNull();
        expect(mockOperationQuery.findManyByCalendarId).not.toHaveBeenCalled();
    });
});
```

- [ ] **Step 2: テストが失敗することを確認する**

```bash
npm run test -- operation-sighting.v3.service --verbose
```

- [ ] **Step 3: `findOneTimeCrossSectionByFormationNumber` を書き換える**

```typescript
async findOneTimeCrossSectionByFormationNumber(params: {
    formationNumber: string;
    searchTime?: string;
}): Promise<OperationSightingTimeCrossSectionDto> {
    const { formationNumber, searchTime } = params;

    const searchTimeInstance = searchTime ? dayjs(searchTime) : dayjs();
    const today = getBaseDate(searchTimeInstance);

    const [latestSighting, calendar] = await Promise.all([
        this.operationSightingQuery.findOneLatestByFormationNumberBeforeTime({
            formationNumber,
            endTime: searchTimeInstance,
        }),
        this.calendarQuery.findOneBySpecificDate({
            date: today.format('YYYY-MM-DD'),
        }),
    ]);

    if (!latestSighting) {
        return { latestSighting: null, expectedSighting: null };
    }

    if (latestSighting.operation.operationNumber === '100') {
        return {
            latestSighting,
            expectedSighting: {
                ...pick(latestSighting, ['formation']),
                operation: pick(latestSighting.operation, ['operationNumber']),
            },
        };
    }

    const reformDate = dayjs(calendar.startDate, 'YYYY-MM-DD');
    const latestSightingBaseDate = getBaseDate(dayjs(latestSighting.sightingTime));

    if (latestSightingBaseDate.isBefore(reformDate)) {
        return { latestSighting, expectedSighting: null };
    }

    const diffDays = today.diff(latestSightingBaseDate, 'day');

    // k=0: 当日目撃済み、変位チェック不要
    if (diffDays === 0) {
        const operations = await this.operationQuery.findManyByCalendarId({
            calendarId: calendar.id,
        });
        return {
            latestSighting,
            expectedSighting: {
                ...pick(latestSighting, ['formation']),
                operation:
                    operations.find(
                        (o) =>
                            o.operationNumber ===
                            latestSighting.operation.operationNumber,
                    ) ?? null,
            },
        };
    }

    // 前進経路: [forward^1(op), ..., forward^k(op)]
    const path: string[] = [];
    let current = latestSighting.operation.operationNumber;
    for (let i = 0; i < diffDays; i++) {
        const next = operationNumberCirculateMap.get(current);
        if (!next) {
            return {
                latestSighting,
                expectedSighting: {
                    ...pick(latestSighting, ['formation']),
                    operation: null,
                },
            };
        }
        current = next;
        path.push(current);
    }

    // 変位チェック: パス上に formationNumber 以外の目撃があるか
    const displacements =
        await this.operationSightingLatestCacheQuery.findManyByOperationNumbers({
            operationNumbers: path,
            afterTime: dayjs(latestSighting.sightingTime),
            beforeTime: searchTimeInstance,
        });

    const displaced = displacements.some(
        (d) => d.formationNumber !== formationNumber,
    );

    const expectedOperationNumber = displaced ? null : current;

    const operations = expectedOperationNumber
        ? await this.operationQuery.findManyByCalendarId({
              calendarId: calendar.id,
          })
        : [];

    return {
        latestSighting,
        expectedSighting: {
            ...pick(latestSighting, ['formation']),
            operation:
                (expectedOperationNumber &&
                    (operations.find(
                        (o) => o.operationNumber === expectedOperationNumber,
                    ) ??
                        null)) ||
                null,
        },
    };
}
```

- [ ] **Step 4: テストが通ることを確認する**

```bash
npm run test -- operation-sighting.v3.service --verbose
```

Expected: PASS（全テスト）

- [ ] **Step 5: ビルドが通ることを確認する**

```bash
npm run build
```

- [ ] **Step 6: コミット**

```bash
git add \
  src/libs/operation-sighting/usecase/operation-sighting.v3.service.ts \
  src/libs/operation-sighting/usecase/operation-sighting.v3.service.spec.ts
git commit -m "refactor: :recycle: time-cross-section をキャッシュ前進投影に書き換える"
```

---

## 動作確認手順（Task 5 実行後）

### エンドポイント確認

```bash
# operation番号エンドポイント
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/v3/operation-sightings/time-cross-section/operation-number/61" | jq .

# formation番号エンドポイント
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/v3/operation-sightings/time-cross-section/formation-number/8001" | jq .
```

---

## Self-Review

**Spec coverage:**
- [x] テーブル定義（id, operation_number, formation_number UNIQUE, operation_sighting_id）
- [x] `sightingTime` はキャッシュに持たず JOIN で取得
- [x] DISTINCT ON 不要（`formationNumber` UNIQUE のため各編成1行）
- [x] 関数名を平易に変更（`findManyLatestGroupByFormationByOperationNumbers`, `findManyLatestGroupByFormationByFormationNumbers`, `findManyByOperationNumbers`）
- [x] POST/INVALIDATE/RESTORE は `DataSource.transaction()` でアトミックに実行（cascade なし・独立集約）
- [x] `OperationSightingLatestCache` は独立集約ルート（`OperationSighting` への cascade なし）
- [x] operation番号エンドポイントの読み込み書き換え（前進投影 + 群離脱チェック）
- [x] formation番号エンドポイントの読み込み書き換え（変位チェック、k=0 ケース）
- [x] マイグレーション（TypeORM CLI 自動生成指示）
