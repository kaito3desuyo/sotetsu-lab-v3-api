import 'reflect-metadata';
import { decideCacheAction } from './operation-sighting.v3.circulation.js';
import { OperationSightingLatestCacheDto } from './dtos/operation-sighting-latest-cache.dto.js';

const cache = (sightingTime: string): OperationSightingLatestCacheDto =>
    Object.assign(new OperationSightingLatestCacheDto(), {
        id: 'cache-1',
        operationSightingId: 's-old',
        operationNumber: '71',
        formationNumber: '10701',
        sightingTime: new Date(sightingTime),
    });

const incoming = (sightingTime: string) => ({
    formationNumber: '10701',
    operationNumber: '72',
    sightingTime: new Date(sightingTime),
});

describe('decideCacheAction', () => {
    it('キャッシュが無ければ upsert（cacheId なし）', () => {
        expect(
            decideCacheAction(null, incoming('2026-11-16T09:00:00+09:00')),
        ).toEqual({
            type: 'upsert',
            cacheId: undefined,
            formationNumber: '10701',
            operationNumber: '72',
        });
    });

    it('キャッシュより新しい目撃なら、そのキャッシュを upsert', () => {
        expect(
            decideCacheAction(
                cache('2026-11-16T08:00:00+09:00'),
                incoming('2026-11-16T09:00:00+09:00'),
            ),
        ).toEqual({
            type: 'upsert',
            cacheId: 'cache-1',
            formationNumber: '10701',
            operationNumber: '72',
        });
    });

    it('キャッシュと同じか古い目撃なら何もしない', () => {
        expect(
            decideCacheAction(
                cache('2026-11-16T09:00:00+09:00'),
                incoming('2026-11-16T09:00:00+09:00'),
            ),
        ).toEqual({ type: 'none' });
        expect(
            decideCacheAction(
                cache('2026-11-16T09:00:00+09:00'),
                incoming('2026-11-16T08:59:59+09:00'),
            ),
        ).toEqual({ type: 'none' });
    });
});
