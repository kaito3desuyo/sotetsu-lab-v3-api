import { describe, expect, it, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import type { OperationSightingLatestCache } from '../domain/operation-sighting-latest-cache.domain.js';
import { OperationSightingLatestCacheCommand } from '../infrastructure/command/operation-sighting-latest-cache.command.js';
import { OperationSightingQuery } from '../infrastructure/queries/operation-sighting.query.js';
import { OperationSightingCliService } from './operation-sighting.cli.service.js';

type FakeManager = {
    query: (sql: string) => Promise<void>;
};

describe('OperationSightingCliService.rebuildLatestCache', () => {
    it('1 つの transaction の中で lock → 全削除 → 最新を読む → 保存の順に、同じ manager で呼ぶ', async () => {
        const order: string[] = [];
        const manager: FakeManager = {
            query: vi.fn(async (sql: string) => {
                order.push(`query:${sql}`);
            }),
        };
        const dataSource = {
            transaction: vi.fn(
                async (fn: (m: FakeManager) => Promise<unknown>) => {
                    order.push('tx-start');
                    const result = await fn(manager);
                    order.push('tx-end');
                    return result;
                },
            ),
        };
        const query = {
            findManyLatestPerFormation: vi.fn(async (m: unknown) => {
                order.push('find');
                expect(m).toBe(manager);
                return [
                    {
                        operationSightingId: 's-1',
                        operation: { operationNumber: '100' },
                        formation: { formationNumber: '10708' },
                    },
                ];
            }),
        };
        const command = {
            removeAll: vi.fn(async (m: unknown) => {
                order.push('removeAll');
                expect(m).toBe(manager);
            }),
            bulkSave: vi.fn(
                async (caches: OperationSightingLatestCache[], m: unknown) => {
                    order.push('bulkSave');
                    expect(m).toBe(manager);
                    expect(caches).toHaveLength(1);
                    expect(caches[0].props).toEqual({
                        operationSightingId: 's-1',
                        operationNumber: '100',
                        formationNumber: '10708',
                    });
                },
            ),
        };
        const moduleRef = await Test.createTestingModule({
            providers: [
                OperationSightingCliService,
                { provide: getDataSourceToken(), useValue: dataSource },
                { provide: OperationSightingQuery, useValue: query },
                {
                    provide: OperationSightingLatestCacheCommand,
                    useValue: command,
                },
            ],
        }).compile();
        const service = moduleRef.get(OperationSightingCliService);

        await service.rebuildLatestCache();

        expect(order).toEqual([
            'tx-start',
            'query:LOCK TABLE operation_sighting_latest_caches IN SHARE ROW EXCLUSIVE MODE',
            'removeAll',
            'find',
            'bulkSave',
            'tx-end',
        ]);
    });
});
