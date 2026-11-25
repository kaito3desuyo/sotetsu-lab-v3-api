import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SharedCache } from './shared-cache.js';
import { InvalidateSharedCacheCommand } from './shared-cache.cli.command.js';

describe('InvalidateSharedCacheCommand', () => {
    const originalTable = process.env.SHARED_CACHE_TABLE_NAME;
    let sharedCache: {
        invalidate: ReturnType<typeof vi.fn>;
        invalidateNamespace: ReturnType<typeof vi.fn>;
    };
    let command: InvalidateSharedCacheCommand;

    beforeEach(() => {
        process.env.SHARED_CACHE_TABLE_NAME = 'shared-cache-table';
        process.exitCode = undefined;
        sharedCache = {
            invalidate: vi.fn().mockResolvedValue(undefined),
            invalidateNamespace: vi.fn().mockResolvedValue(undefined),
        };
        command = new InvalidateSharedCacheCommand(
            sharedCache as unknown as SharedCache,
        );
        vi.spyOn(console, 'log').mockImplementation(() => undefined);
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
    });

    afterEach(() => {
        if (originalTable === undefined) {
            delete process.env.SHARED_CACHE_TABLE_NAME;
        } else {
            process.env.SHARED_CACHE_TABLE_NAME = originalTable;
        }
        process.exitCode = undefined;
        vi.restoreAllMocks();
    });

    it('--namespace trip-blocks で invalidateNamespace を呼ぶ', async () => {
        await command.run([], { namespace: ['trip-blocks'] });

        expect(sharedCache.invalidateNamespace).toHaveBeenCalledTimes(1);
        expect(sharedCache.invalidateNamespace).toHaveBeenCalledWith({
            namespace: 'trip-blocks',
        });
        expect(sharedCache.invalidate).not.toHaveBeenCalled();
        expect(process.exitCode).toBeUndefined();
    });

    it('--tag calendar:a --tag calendar:b で invalidate を 2 つのタグで呼ぶ', async () => {
        await command.run([], { tag: ['calendar:a', 'calendar:b'] });

        expect(sharedCache.invalidate).toHaveBeenCalledTimes(1);
        expect(sharedCache.invalidate).toHaveBeenCalledWith({
            tags: ['calendar:a', 'calendar:b'],
        });
        expect(sharedCache.invalidateNamespace).not.toHaveBeenCalled();
        expect(process.exitCode).toBeUndefined();
    });

    it('どちらも無ければ呼ばずに exitCode 1', async () => {
        await command.run([], {});

        expect(sharedCache.invalidate).not.toHaveBeenCalled();
        expect(sharedCache.invalidateNamespace).not.toHaveBeenCalled();
        expect(process.exitCode).toBe(1);
    });

    it('テーブル名が無ければ、何もしない旨を出して exitCode 1', async () => {
        process.env.SHARED_CACHE_TABLE_NAME = '';

        await command.run([], { namespace: ['trip-blocks'], tag: ['a'] });

        expect(sharedCache.invalidate).not.toHaveBeenCalled();
        expect(sharedCache.invalidateNamespace).not.toHaveBeenCalled();
        expect(console.error).toHaveBeenCalledWith(
            expect.stringContaining('SHARED_CACHE_TABLE_NAME'),
        );
        expect(process.exitCode).toBe(1);
    });
});
