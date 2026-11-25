import { randomBytes } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import {
    BatchGetItemCommand,
    PutItemCommand,
    UpdateItemCommand,
    type AttributeValue,
    type DynamoDBClient,
} from '@aws-sdk/client-dynamodb';
import { Logger } from '@nestjs/common';
import { SHARED_CACHE_INVALIDATE_FAILED_MESSAGE } from './shared-cache.log.js';
import {
    SHARED_CACHE_CLIENT_CONFIG,
    SHARED_CACHE_DEFAULT_TTL_SECONDS,
    SHARED_CACHE_MAX_BODY_BYTES,
    SHARED_CACHE_PUT_BUDGET_MS,
    SharedCache,
} from './shared-cache.js';

type Item = Record<string, AttributeValue>;

describe('SharedCache', () => {
    const TABLE = 't';
    const ORIGINAL = process.env.SHARED_CACHE_TABLE_NAME;
    let store: Map<string, Item>;
    let failWith: { [K in 'batchGet' | 'put' | 'update']?: Error };
    let unprocessed: boolean;
    const send = vi.fn();
    const client = { send } as unknown as DynamoDBClient;
    let warn: ReturnType<typeof vi.spyOn>;

    const sent = <T>(type: new (...args: never[]) => T): T[] =>
        send.mock.calls
            .map((call) => call[0] as unknown)
            .filter((c): c is T => c instanceof type);

    const params = (
        over: Partial<Parameters<SharedCache['getOrLoad']>[0]> & {
            load: () => Promise<unknown>;
        },
    ) => ({
        namespace: 'trip-blocks',
        key: ['cal-a', 'up'] as const,
        tags: ['calendar:a'] as const,
        ...over,
    });

    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-11-25T00:00:00Z'));
        process.env.SHARED_CACHE_TABLE_NAME = TABLE;
        store = new Map();
        failWith = {};
        unprocessed = false;
        send.mockReset();
        send.mockImplementation(async (command: unknown) => {
            if (command instanceof BatchGetItemCommand) {
                if (failWith.batchGet) throw failWith.batchGet;
                const keys = command.input.RequestItems?.[TABLE]?.Keys ?? [];
                const items = keys
                    .map((k) => store.get(k.pk.S as string))
                    .filter((i): i is Item => i !== undefined);
                return {
                    Responses: { [TABLE]: items },
                    UnprocessedKeys: unprocessed
                        ? { [TABLE]: { Keys: [keys[0]] } }
                        : {},
                };
            }
            if (command instanceof PutItemCommand) {
                if (failWith.put) throw failWith.put;
                const item = command.input.Item as Item;
                store.set(item.pk.S as string, item);
                return {};
            }
            if (command instanceof UpdateItemCommand) {
                if (failWith.update) throw failWith.update;
                const pk = command.input.Key?.pk.S as string;
                const current = Number(store.get(pk)?.version?.N ?? '0');
                store.set(pk, {
                    pk: { S: pk },
                    version: { N: `${current + 1}` },
                });
                return {};
            }
            throw new Error('unexpected command');
        });
        warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
        warn.mockRestore();
        vi.useRealTimers();
        if (ORIGINAL === undefined) {
            delete process.env.SHARED_CACHE_TABLE_NAME;
        } else {
            process.env.SHARED_CACHE_TABLE_NAME = ORIGINAL;
        }
    });

    it('定数とクライアント設定', () => {
        expect(SHARED_CACHE_MAX_BODY_BYTES).toBe(380 * 1024);
        expect(SHARED_CACHE_DEFAULT_TTL_SECONDS).toBe(86_400);
        expect(SHARED_CACHE_PUT_BUDGET_MS).toBe(2_000);
        expect(SHARED_CACHE_CLIENT_CONFIG).toEqual({
            maxAttempts: 1,
            requestHandler: {
                connectionTimeout: 300,
                requestTimeout: 1000,
                throwOnRequestTimeout: true,
            },
        });
    });

    it('テーブル名が無ければ毎回 load を呼び、DynamoDB に触らない', async () => {
        process.env.SHARED_CACHE_TABLE_NAME = '';
        const load = vi.fn(async () => ({ a: 1 }));
        const cache = new SharedCache(client);
        const first = await cache.getOrLoad(params({ load }));
        await cache.getOrLoad(params({ load }));
        expect(load).toHaveBeenCalledTimes(2);
        expect(send).not.toHaveBeenCalled();
        expect(first).toEqual({ a: 1 });
    });

    it('外れたら load の結果を置き、次は load を呼ばずに同じ値を返す', async () => {
        const load = vi.fn(async () => ({ a: 1, b: ['x'] }));
        const cache = new SharedCache(client);
        const first = await cache.getOrLoad(params({ load }));
        const second = await cache.getOrLoad(params({ load }));
        expect(load).toHaveBeenCalledTimes(1);
        expect(second).toEqual(first);
        expect(second).toEqual({ a: 1, b: ['x'] });
    });

    it('返す値は置いた値の写しで、書き換えても次の読みに影響しない', async () => {
        const load = vi.fn(async () => ({ list: [1, 2] }));
        const cache = new SharedCache(client);
        const first = (await cache.getOrLoad(params({ load }))) as {
            list: number[];
        };
        first.list.push(99);
        const second = await cache.getOrLoad(params({ load }));
        expect(second).toEqual({ list: [1, 2] });
    });

    it('key が違えば別の値', async () => {
        const cache = new SharedCache(client);
        const a = await cache.getOrLoad(
            params({ key: ['a'], load: async () => 'A' }),
        );
        const b = await cache.getOrLoad(
            params({ key: ['b'], load: async () => 'B' }),
        );
        expect([a, b]).toEqual(['A', 'B']);
    });

    it('namespace が違えば別の値', async () => {
        const cache = new SharedCache(client);
        const a = await cache.getOrLoad(
            params({ namespace: 'x', load: async () => 'X' }),
        );
        const b = await cache.getOrLoad(
            params({ namespace: 'y', load: async () => 'Y' }),
        );
        expect([a, b]).toEqual(['X', 'Y']);
    });

    it('タグを捨てたら外れる。別のタグを捨てても当たる', async () => {
        const load = vi.fn(async () => 'v');
        const cache = new SharedCache(client);
        await cache.getOrLoad(params({ load }));
        await cache.invalidate({ tags: ['calendar:b'] });
        await cache.getOrLoad(params({ load }));
        expect(load).toHaveBeenCalledTimes(1);
        await cache.invalidate({ tags: ['calendar:a'] });
        await cache.getOrLoad(params({ load }));
        expect(load).toHaveBeenCalledTimes(2);
        await cache.getOrLoad(params({ load }));
        expect(load).toHaveBeenCalledTimes(2);
    });

    it('名前空間を捨てたら、その名前空間の値だけ外れる', async () => {
        const loadA = vi.fn(async () => 'a');
        const loadB = vi.fn(async () => 'b');
        const cache = new SharedCache(client);
        await cache.getOrLoad(params({ namespace: 'x', load: loadA }));
        await cache.getOrLoad(params({ namespace: 'y', load: loadB }));
        await cache.invalidateNamespace({ namespace: 'x' });
        await cache.getOrLoad(params({ namespace: 'x', load: loadA }));
        await cache.getOrLoad(params({ namespace: 'y', load: loadB }));
        expect(loadA).toHaveBeenCalledTimes(2);
        expect(loadB).toHaveBeenCalledTimes(1);
    });

    it('版の項目が無くても当たる', async () => {
        const load = vi.fn(async () => 'v');
        const cache = new SharedCache(client);
        await cache.getOrLoad(params({ load }));
        expect(store.has('tag#calendar:a')).toBe(false);
        await cache.getOrLoad(params({ load }));
        expect(load).toHaveBeenCalledTimes(1);
    });

    it('load の最中に捨てられた値は次に外れる', async () => {
        const cache = new SharedCache(client);
        const load = vi.fn(async () => {
            await cache.invalidate({ tags: ['calendar:a'] });
            return 'v';
        });
        const first = await cache.getOrLoad(params({ load }));
        expect(first).toBe('v');
        await cache.getOrLoad(params({ load }));
        expect(load).toHaveBeenCalledTimes(2);
    });

    it('期限を過ぎた値は外れる', async () => {
        const load = vi.fn(async () => 'v');
        const cache = new SharedCache(client);
        await cache.getOrLoad(params({ ttlSeconds: 60, load }));
        vi.setSystemTime(new Date('2026-11-25T00:00:59Z'));
        await cache.getOrLoad(params({ ttlSeconds: 60, load }));
        expect(load).toHaveBeenCalledTimes(1);
        vi.setSystemTime(new Date('2026-11-25T00:01:01Z'));
        await cache.getOrLoad(params({ ttlSeconds: 60, load }));
        expect(load).toHaveBeenCalledTimes(2);
    });

    it('expiresAt が無い、または数でない値は外れとして load を呼ぶ', async () => {
        const cache = new SharedCache(client);
        for (const broken of [undefined, { N: 'abc' }]) {
            store.clear();
            const load = vi.fn(async () => 'v');
            await cache.getOrLoad(params({ load }));
            const [entry] = [...store.values()];
            if (broken === undefined) {
                delete entry.expiresAt;
            } else {
                entry.expiresAt = broken;
            }
            await cache.getOrLoad(params({ load }));
            expect(load).toHaveBeenCalledTimes(2);
        }
    });

    it('bypass なら読まずに load し、置き直す', async () => {
        let n = 0;
        const load = vi.fn(async () => `v${++n}`);
        const cache = new SharedCache(client);
        expect(await cache.getOrLoad(params({ load }))).toBe('v1');
        expect(await cache.getOrLoad(params({ load, bypass: true }))).toBe(
            'v2',
        );
        expect(load).toHaveBeenCalledTimes(2);
        expect(await cache.getOrLoad(params({ load }))).toBe('v2');
        expect(load).toHaveBeenCalledTimes(2);
    });

    it('圧縮後に上限を超える値は置かず、load の結果を返す', async () => {
        const big = randomBytes(600 * 1024).toString('base64');
        const load = vi.fn(async () => ({ big }));
        const cache = new SharedCache(client);
        const result = await cache.getOrLoad(params({ load }));
        expect(result).toEqual({ big });
        expect(sent(PutItemCommand)).toHaveLength(0);
        expect(warn).toHaveBeenCalled();
    });

    it('置けない大きな値は、写しを作らず load の結果をそのまま返す', async () => {
        const loaded = { big: randomBytes(600 * 1024).toString('base64') };
        const cache = new SharedCache(client);
        const parse = vi.spyOn(JSON, 'parse');
        const result = await cache.getOrLoad(
            params({ load: async () => loaded }),
        );
        expect(result).toBe(loaded);
        expect(parse).not.toHaveBeenCalled();
        parse.mockRestore();
    });

    it('load が予算を超えて遅いときは PutItem をせず、load の結果を返して warn する', async () => {
        const loaded = { a: 1 };
        const cache = new SharedCache(client);
        const result = await cache.getOrLoad(
            params({
                load: async () => {
                    vi.advanceTimersByTime(SHARED_CACHE_PUT_BUDGET_MS + 1);
                    return loaded;
                },
            }),
        );
        expect(result).toBe(loaded);
        expect(sent(PutItemCommand)).toHaveLength(0);
        expect(warn).toHaveBeenCalledTimes(1);
    });

    it('予算ちょうどなら置く', async () => {
        const cache = new SharedCache(client);
        await cache.getOrLoad(
            params({
                load: async () => {
                    vi.advanceTimersByTime(SHARED_CACHE_PUT_BUDGET_MS);
                    return { a: 1 };
                },
            }),
        );
        expect(sent(PutItemCommand)).toHaveLength(1);
    });

    it('JSON にできない値（循環）でも reject せず、load の結果を返して warn する', async () => {
        const loaded: Record<string, unknown> = {};
        loaded.self = loaded;
        const cache = new SharedCache(client);
        await expect(
            cache.getOrLoad(params({ load: async () => loaded })),
        ).resolves.toBe(loaded);
        expect(sent(PutItemCommand)).toHaveLength(0);
        expect(warn).toHaveBeenCalled();
    });

    it('bypass なら BatchGetItem の Keys に entry# を含めない', async () => {
        const cache = new SharedCache(client);
        await cache.getOrLoad(params({ load: async () => 'v' }));
        send.mockClear();
        await cache.getOrLoad(params({ load: async () => 'w', bypass: true }));
        const [batch] = sent(BatchGetItemCommand);
        const keys = (batch.input.RequestItems?.[TABLE]?.Keys ?? []).map(
            (k) => k.pk.S,
        );
        expect(keys).toEqual(['tag#calendar:a', 'ns#trip-blocks']);
        expect(keys.some((k) => k?.startsWith('entry#'))).toBe(false);
    });

    it('body が gzip でない・JSON でない値は外れとして load を呼ぶ', async () => {
        const cache = new SharedCache(client);
        for (const body of [Buffer.from('not gzip'), gzipSync('{not json')]) {
            store.clear();
            const load = vi.fn(async () => 'v');
            await cache.getOrLoad(params({ load }));
            const [entry] = [...store.values()];
            entry.body = { B: body };
            warn.mockClear();
            await expect(cache.getOrLoad(params({ load }))).resolves.toBe('v');
            expect(load).toHaveBeenCalledTimes(2);
            expect(warn).toHaveBeenCalled();
        }
    });

    it('読む失敗では load の結果を返す', async () => {
        failWith.batchGet = new Error('boom');
        const load = vi.fn(async () => 'v');
        const cache = new SharedCache(client);
        await expect(cache.getOrLoad(params({ load }))).resolves.toBe('v');
        expect(warn).toHaveBeenCalled();
    });

    it('UnprocessedKeys が残ったら外れとして扱う', async () => {
        const load = vi.fn(async () => 'v');
        const cache = new SharedCache(client);
        await cache.getOrLoad(params({ load }));
        unprocessed = true;
        await cache.getOrLoad(params({ load }));
        expect(load).toHaveBeenCalledTimes(2);
    });

    it('置く失敗でも値を返す', async () => {
        failWith.put = new Error('boom');
        const load = vi.fn(async () => 'v');
        const cache = new SharedCache(client);
        await expect(cache.getOrLoad(params({ load }))).resolves.toBe('v');
        expect(warn).toHaveBeenCalled();
    });

    it('invalidate は失敗しても reject しない', async () => {
        failWith.update = new Error('boom');
        const cache = new SharedCache(client);
        await expect(cache.invalidate({ tags: ['calendar:a'] })).resolves.toBe(
            false,
        );
        await expect(
            cache.invalidateNamespace({ namespace: 'x' }),
        ).resolves.toBe(false);
        expect(warn).toHaveBeenCalled();
    });

    it('捨てるのに失敗した warn は、アラームのログのフィルターが数える文言で始まる', async () => {
        failWith.update = new Error('boom');
        await new SharedCache(client).invalidate({ tags: ['calendar:a'] });
        expect(SHARED_CACHE_INVALIDATE_FAILED_MESSAGE).toBe(
            '共有キャッシュの破棄に失敗しました',
        );
        expect(warn).toHaveBeenCalledWith(
            expect.stringMatching(
                new RegExp(`^${SHARED_CACHE_INVALIDATE_FAILED_MESSAGE}`),
            ),
        );
    });

    it('invalidate は全て成功したら true を返す', async () => {
        const cache = new SharedCache(client);
        await expect(
            cache.invalidate({ tags: ['calendar:a', 'calendar:b'] }),
        ).resolves.toBe(true);
        await expect(
            cache.invalidateNamespace({ namespace: 'x' }),
        ).resolves.toBe(true);
    });

    it('テーブル名が空なら invalidate は false を返す', async () => {
        process.env.SHARED_CACHE_TABLE_NAME = '';
        const cache = new SharedCache(client);
        await expect(cache.invalidate({ tags: ['a'] })).resolves.toBe(false);
        await expect(
            cache.invalidateNamespace({ namespace: 'x' }),
        ).resolves.toBe(false);
        expect(send).not.toHaveBeenCalled();
    });

    it('タグが空なら何も送らず、false を返す', async () => {
        await expect(
            new SharedCache(client).invalidate({ tags: [] }),
        ).resolves.toBe(false);
        expect(send).not.toHaveBeenCalled();
    });

    it('load が失敗したら reject し、何も置かない', async () => {
        const cache = new SharedCache(client);
        await expect(
            cache.getOrLoad(
                params({
                    load: async () => {
                        throw new Error('db down');
                    },
                }),
            ),
        ).rejects.toThrow('db down');
        expect(sent(PutItemCommand)).toHaveLength(0);
    });

    it('置く項目の形', async () => {
        const cache = new SharedCache(client);
        await cache.getOrLoad(params({ load: async () => ({ a: 1 }) }));
        const [put] = sent(PutItemCommand);
        const item = put.input.Item as Item;
        expect(put.input.TableName).toBe(TABLE);
        expect(item.pk.S).toMatch(/^entry#trip-blocks#/);
        expect(item.namespace.S).toBe('trip-blocks');
        expect(item.keyParts.S).toBe('["cal-a","up"]');
        expect(item.body.B).toBeInstanceOf(Uint8Array);
        expect(item.tagVersions.M).toEqual({
            'tag#calendar:a': { N: '0' },
            'ns#trip-blocks': { N: '0' },
        });
        expect(item.expiresAt.N).toBe(
            `${Math.floor(Date.now() / 1000) + SHARED_CACHE_DEFAULT_TTL_SECONDS}`,
        );
    });
});
