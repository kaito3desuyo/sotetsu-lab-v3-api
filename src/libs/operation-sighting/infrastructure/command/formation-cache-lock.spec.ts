import type { EntityManager } from 'typeorm';
import { lockFormationCache } from './formation-cache-lock.js';

describe('lockFormationCache', () => {
    it('SET LOCAL lock_timeout → advisory lock → LOCK TABLE の順に同じ manager で流す', async () => {
        const query = vi.fn(
            async (_sql: string, _params?: unknown[]): Promise<unknown> => [],
        );
        const manager = { query } as unknown as EntityManager;

        await lockFormationCache(manager, '8001');

        expect(query.mock.calls).toEqual([
            ["SET LOCAL lock_timeout = '1000ms'"],
            [
                'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
                ['operation-sighting-latest-cache:8001'],
            ],
            [
                'LOCK TABLE operation_sighting_latest_caches IN ROW EXCLUSIVE MODE',
            ],
        ]);
    });
});
