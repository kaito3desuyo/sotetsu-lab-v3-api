import { brotliCompressSync, gzipSync } from 'node:zlib';
import {
    BatchGetItemCommand,
    BatchWriteItemCommand,
    UpdateItemCommand,
    type AttributeValue,
    type DynamoDBClient,
} from '@aws-sdk/client-dynamodb';
import { Logger } from '@nestjs/common';
import { SHARED_CACHE_INVALIDATE_FAILED_MESSAGE } from './shared-cache.log.js';
import {
    SHARED_CACHE_CLIENT_CONFIG,
    SHARED_CACHE_DEFAULT_TTL_SECONDS,
    SHARED_CACHE_MAX_PARTS,
    SHARED_CACHE_PART_BYTES,
    SHARED_CACHE_PUT_BUDGET_MS,
    SHARED_CACHE_SEND_TIMEOUT_MS,
    SharedCache,
} from './shared-cache.js';

// brotli の結果の長さを境目のテストで固定するため、縮める関数だけ差し替えられるようにする
// （node:zlib の名前付き import は spyOn できない）。override が空なら本物
const zlibOverride = vi.hoisted(() => ({
    compress: undefined as ((input: string) => Buffer) | undefined,
}));
vi.mock('node:zlib', async (importOriginal) => {
    const actual = await importOriginal<typeof import('node:zlib')>();
    return {
        ...actual,
        brotliCompressSync: ((
            ...args: Parameters<typeof actual.brotliCompressSync>
        ) =>
            zlibOverride.compress
                ? zlibOverride.compress(String(args[0]))
                : actual.brotliCompressSync(
                      ...args,
                  )) as typeof actual.brotliCompressSync,
    };
});

type Item = Record<string, AttributeValue>;

/** 決まった種の擬似乱数（mulberry32）。毎回同じ値＝同じ圧縮後の大きさになる */
const seededBase64 = (bytes: number, seed = 1): string => {
    const buf = Buffer.alloc(bytes);
    let a = seed;
    for (let i = 0; i < bytes; i++) {
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        buf[i] = ((t ^ (t >>> 14)) >>> 0) & 0xff;
    }
    return buf.toString('base64');
};

describe('SharedCache', () => {
    const TABLE = 't';
    const ORIGINAL = process.env.SHARED_CACHE_TABLE_NAME;
    let store: Map<string, Item>;
    let failWith: { [K in 'batchGet' | 'write' | 'update']?: Error };
    let unprocessed: boolean;
    let dropWrite: ((item: Item) => boolean) | undefined;
    const send = vi.fn();
    const client = { send } as unknown as DynamoDBClient;
    let warn: ReturnType<typeof vi.spyOn>;

    const sent = <T>(type: new (...args: never[]) => T): T[] =>
        send.mock.calls
            .map((call) => call[0] as unknown)
            .filter((c): c is T => c instanceof type);

    /** 書き込みで送られた項目（先頭と続き） */
    const written = (): Item[] =>
        sent(BatchWriteItemCommand).flatMap((c) =>
            (c.input.RequestItems?.[TABLE] ?? []).map(
                (r) => r.PutRequest?.Item as Item,
            ),
        );
    const headOf = (): Item => {
        const [head] = [...store.values()].filter((i) =>
            /^entry#[^#]+#[0-9a-f]{64}$/.test(i.pk.S as string),
        );
        return head;
    };

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
        dropWrite = undefined;
        zlibOverride.compress = undefined;
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
            if (command instanceof BatchWriteItemCommand) {
                if (failWith.write) throw failWith.write;
                const requests = command.input.RequestItems?.[TABLE] ?? [];
                const rest: typeof requests = [];
                for (const request of requests) {
                    const item = request.PutRequest?.Item as Item;
                    if (dropWrite?.(item)) {
                        rest.push(request);
                        continue;
                    }
                    store.set(item.pk.S as string, item);
                }
                return {
                    UnprocessedItems: rest.length ? { [TABLE]: rest } : {},
                };
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
        expect(SHARED_CACHE_DEFAULT_TTL_SECONDS).toBe(86_400);
        expect(SHARED_CACHE_PUT_BUDGET_MS).toBe(1_500);
        expect(SHARED_CACHE_SEND_TIMEOUT_MS).toBe(1_000);
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
        const big = seededBase64(1_500_000);
        const load = vi.fn(async () => ({ big }));
        const cache = new SharedCache(client);
        const result = await cache.getOrLoad(params({ load }));
        expect(result).toEqual({ big });
        expect(sent(BatchWriteItemCommand)).toHaveLength(0);
        expect(warn).toHaveBeenCalled();
    });

    it('置けない大きな値は、写しを作らず load の結果をそのまま返す', async () => {
        const loaded = { big: seededBase64(1_500_000) };
        const cache = new SharedCache(client);
        const parse = vi.spyOn(JSON, 'parse');
        const result = await cache.getOrLoad(
            params({ load: async () => loaded }),
        );
        expect(result).toBe(loaded);
        expect(parse).not.toHaveBeenCalled();
        parse.mockRestore();
    });

    it('load が予算を超えて遅いときは書き込みをせず、load の結果を返して warn する', async () => {
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
        expect(sent(BatchWriteItemCommand)).toHaveLength(0);
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
        expect(sent(BatchWriteItemCommand)).toHaveLength(1);
    });

    it('stringify・brotli が遅くて予算を超えたときも、書き込みをせず load の結果を返して warn する', async () => {
        const loaded = { a: 1 };
        zlibOverride.compress = (input) => {
            vi.advanceTimersByTime(SHARED_CACHE_PUT_BUDGET_MS + 1);
            return Buffer.from(input);
        };
        const cache = new SharedCache(client);
        const result = await cache.getOrLoad(
            params({ load: async () => loaded }),
        );
        expect(result).toBe(loaded);
        expect(sent(BatchWriteItemCommand)).toHaveLength(0);
        expect(warn).toHaveBeenCalledTimes(1);
    });

    it('load と brotli の合計が予算ちょうどなら置く', async () => {
        zlibOverride.compress = (input) => {
            vi.advanceTimersByTime(SHARED_CACHE_PUT_BUDGET_MS - 100);
            return Buffer.from(input);
        };
        const cache = new SharedCache(client);
        await cache.getOrLoad(
            params({
                load: async () => {
                    vi.advanceTimersByTime(100);
                    return { a: 1 };
                },
            }),
        );
        expect(sent(BatchWriteItemCommand)).toHaveLength(1);
    });

    it('各 send に 1 秒の abortSignal を付ける', async () => {
        const timeout = vi.spyOn(AbortSignal, 'timeout');
        const cache = new SharedCache(client);
        await cache.getOrLoad(params({ load: async () => ({ a: 1 }) }));
        await cache.invalidate({ tags: ['calendar:a'] });
        expect(send).toHaveBeenCalledTimes(3);
        for (const call of send.mock.calls) {
            expect(call[1]?.abortSignal).toBeInstanceOf(AbortSignal);
        }
        expect(timeout).toHaveBeenCalledTimes(3);
        expect(timeout).toHaveBeenCalledWith(SHARED_CACHE_SEND_TIMEOUT_MS);
        timeout.mockRestore();
    });

    describe('abortSignal で打ち切られたとき', () => {
        const aborted = () =>
            Object.assign(new Error('The operation was aborted'), {
                name: 'TimeoutError',
            });

        it('読みなら外れとして load を呼ぶ', async () => {
            failWith.batchGet = aborted();
            const load = vi.fn(async () => ({ a: 1 }));
            const result = await new SharedCache(client).getOrLoad(
                params({ load }),
            );
            expect(result).toEqual({ a: 1 });
            expect(load).toHaveBeenCalledTimes(1);
            expect(warn).toHaveBeenCalled();
        });

        it('書きなら warn して値を返す', async () => {
            failWith.write = aborted();
            const result = await new SharedCache(client).getOrLoad(
                params({ load: async () => ({ a: 1 }) }),
            );
            expect(result).toEqual({ a: 1 });
            expect(warn).toHaveBeenCalledTimes(1);
        });

        it('invalidate は reject せず false を返す', async () => {
            failWith.update = aborted();
            await expect(
                new SharedCache(client).invalidate({ tags: ['calendar:a'] }),
            ).resolves.toBe(false);
        });
    });

    it('JSON にできない値（循環）でも reject せず、load の結果を返して warn する', async () => {
        const loaded: Record<string, unknown> = {};
        loaded.self = loaded;
        const cache = new SharedCache(client);
        await expect(
            cache.getOrLoad(params({ load: async () => loaded })),
        ).resolves.toBe(loaded);
        expect(sent(BatchWriteItemCommand)).toHaveLength(0);
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

    it('brotli で戻せない・JSON でない body は外れとして load を呼ぶ', async () => {
        const cache = new SharedCache(client);
        for (const body of [
            Buffer.from('not brotli'),
            brotliCompressSync('{not json'),
        ]) {
            store.clear();
            const load = vi.fn(async () => 'v');
            await cache.getOrLoad(params({ load }));
            const entry = headOf();
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
        failWith.write = new Error('boom');
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
        expect(sent(BatchWriteItemCommand)).toHaveLength(0);
    });

    it('置く項目の形', async () => {
        const cache = new SharedCache(client);
        await cache.getOrLoad(params({ load: async () => ({ a: 1 }) }));
        const [batch] = sent(BatchWriteItemCommand);
        expect(batch.input.RequestItems?.[TABLE]).toHaveLength(1);
        const item = written()[0];
        expect(item.pk.S).toMatch(/^entry#trip-blocks#[0-9a-f]{64}$/);
        expect(item.namespace.S).toBe('trip-blocks');
        expect(item.keyParts.S).toBe('["cal-a","up"]');
        expect(item.body.B).toBeInstanceOf(Uint8Array);
        expect(item.parts.N).toBe('1');
        expect(item.writeId.S).toMatch(/^[0-9a-f-]{36}$/);
        expect(item.tagVersions.M).toEqual({
            'tag#calendar:a': { N: '0' },
            'ns#trip-blocks': { N: '0' },
        });
        expect(item.expiresAt.N).toBe(
            `${Math.floor(Date.now() / 1000) + SHARED_CACHE_DEFAULT_TTL_SECONDS}`,
        );
    });

    describe('分けて置く', () => {
        const fixedSize = (bytes: number) => {
            zlibOverride.compress = () => Buffer.alloc(bytes, 7);
        };
        const partsOf = () => written().map((i) => i.body.B?.byteLength);

        it('定数', () => {
            expect(SHARED_CACHE_PART_BYTES).toBe(350 * 1024);
            expect(SHARED_CACHE_MAX_PARTS).toBe(4);
        });

        it('切れ端 2 つ以上の値も置いて当たる（2 回目は load を呼ばない）', async () => {
            const value = { big: seededBase64(500_000) };
            const load = vi.fn(async () => value);
            const cache = new SharedCache(client);
            expect(await cache.getOrLoad(params({ load }))).toEqual(value);
            expect(written().length).toBeGreaterThanOrEqual(2);
            expect(await cache.getOrLoad(params({ load }))).toEqual(value);
            expect(load).toHaveBeenCalledTimes(1);
        });

        it('350KB ちょうどは 1 切れ、1 バイト超えると 2 切れで書く', async () => {
            const cache = new SharedCache(client);
            fixedSize(SHARED_CACHE_PART_BYTES);
            await cache.getOrLoad(params({ load: async () => 'a' }));
            expect(partsOf()).toEqual([SHARED_CACHE_PART_BYTES]);
            expect(written()[0].parts.N).toBe('1');

            send.mockClear();
            fixedSize(SHARED_CACHE_PART_BYTES + 1);
            await cache.getOrLoad(
                params({ load: async () => 'b', bypass: true }),
            );
            expect(partsOf()).toEqual([SHARED_CACHE_PART_BYTES, 1]);
            const [head, rest] = written();
            expect(head.parts.N).toBe('2');
            expect(rest.pk.S).toBe(`${head.pk.S}#1`);
            expect(rest.writeId.S).toBe(head.writeId.S);
            expect(rest.expiresAt.N).toBe(head.expiresAt.N);
            expect(rest.tagVersions).toBeUndefined();
        });

        it('1.4MB ちょうどは置き、1 バイト超えると置かずに load の結果をそのまま返す', async () => {
            const cache = new SharedCache(client);
            const max = SHARED_CACHE_PART_BYTES * SHARED_CACHE_MAX_PARTS;
            fixedSize(max);
            await cache.getOrLoad(params({ load: async () => 'a' }));
            expect(written()).toHaveLength(4);
            expect(written()[0].parts.N).toBe('4');

            send.mockClear();
            warn.mockClear();
            fixedSize(max + 1);
            const loaded = { a: 1 };
            const result = await cache.getOrLoad(
                params({ load: async () => loaded, bypass: true }),
            );
            expect(result).toBe(loaded);
            expect(sent(BatchWriteItemCommand)).toHaveLength(0);
            expect(warn).toHaveBeenCalled();
        });

        const writeThreeParts = async (cache: SharedCache) => {
            const value = { big: seededBase64(800_000) };
            await cache.getOrLoad(params({ load: async () => value }));
            expect(headOf().parts.N).toBe('3');
            return value;
        };

        it('続きが欠けていれば外れとして load を呼ぶ', async () => {
            const cache = new SharedCache(client);
            const value = await writeThreeParts(cache);
            store.delete(`${headOf().pk.S}#2`);
            const load = vi.fn(async () => value);
            await cache.getOrLoad(params({ load }));
            expect(load).toHaveBeenCalledTimes(1);
        });

        it('writeId が先頭と違う続きがあれば外れとして load を呼ぶ', async () => {
            const cache = new SharedCache(client);
            const value = await writeThreeParts(cache);
            store.get(`${headOf().pk.S}#1`)!.writeId = { S: 'other' };
            const load = vi.fn(async () => value);
            await cache.getOrLoad(params({ load }));
            expect(load).toHaveBeenCalledTimes(1);
        });

        it('parts の無い古い項目（gzip の値）は外れとして load を呼ぶ', async () => {
            const cache = new SharedCache(client);
            await cache.getOrLoad(params({ load: async () => 'old' }));
            const entry = headOf();
            delete entry.parts;
            delete entry.writeId;
            entry.body = { B: gzipSync(JSON.stringify('old')) };
            const load = vi.fn(async () => 'new');
            expect(await cache.getOrLoad(params({ load }))).toBe('new');
            expect(load).toHaveBeenCalledTimes(1);
        });

        it('先頭に writeId が無ければ外れとして load を呼ぶ', async () => {
            const cache = new SharedCache(client);
            await cache.getOrLoad(params({ load: async () => 'v' }));
            delete headOf().writeId;
            const load = vi.fn(async () => 'w');
            expect(await cache.getOrLoad(params({ load }))).toBe('w');
            expect(load).toHaveBeenCalledTimes(1);
        });

        it('続きの項目に body 属性が無ければ外れとして load を呼ぶ', async () => {
            const cache = new SharedCache(client);
            const value = await writeThreeParts(cache);
            delete store.get(`${headOf().pk.S}#1`)!.body;
            const load = vi.fn(async () => value);
            await cache.getOrLoad(params({ load }));
            expect(load).toHaveBeenCalledTimes(1);
        });

        it('parts が 1〜4 の整数でなければ外れとして load を呼ぶ', async () => {
            const cache = new SharedCache(client);
            for (const parts of ['0', '5', '1.5', 'abc']) {
                store.clear();
                await cache.getOrLoad(params({ load: async () => 'v' }));
                headOf().parts = { N: parts };
                const load = vi.fn(async () => 'w');
                await cache.getOrLoad(params({ load }));
                expect(load).toHaveBeenCalledTimes(1);
            }
        });

        it('切れ端を減らして書き直すと、残った古い続きは使わない', async () => {
            const cache = new SharedCache(client);
            await writeThreeParts(cache);
            const pk = headOf().pk.S;
            await cache.getOrLoad(
                params({ load: async () => 'small', bypass: true }),
            );
            expect(headOf().parts.N).toBe('1');
            expect(store.has(`${pk}#1`)).toBe(true);
            expect(store.has(`${pk}#2`)).toBe(true);
            const load = vi.fn(async () => 'never');
            expect(await cache.getOrLoad(params({ load }))).toBe('small');
            expect(load).not.toHaveBeenCalled();
        });

        it('読みの BatchGetItem は先頭と続き #1〜#3 とタグ・名前空間を 1 回で取る', async () => {
            const cache = new SharedCache(client);
            await cache.getOrLoad(params({ load: async () => 'v' }));
            const pk = headOf().pk.S;
            send.mockClear();
            await cache.getOrLoad(params({ load: async () => 'v' }));
            const batches = sent(BatchGetItemCommand);
            expect(batches).toHaveLength(1);
            const keys = (
                batches[0].input.RequestItems?.[TABLE]?.Keys ?? []
            ).map((k) => k.pk.S);
            expect(keys).toEqual([
                pk,
                `${pk}#1`,
                `${pk}#2`,
                `${pk}#3`,
                'tag#calendar:a',
                'ns#trip-blocks',
            ]);
        });

        it('bypass なら先頭も続きも Keys に入れない', async () => {
            const cache = new SharedCache(client);
            await cache.getOrLoad(params({ load: async () => 'v' }));
            send.mockClear();
            await cache.getOrLoad(
                params({ load: async () => 'w', bypass: true }),
            );
            const [batch] = sent(BatchGetItemCommand);
            const keys = (batch.input.RequestItems?.[TABLE]?.Keys ?? []).map(
                (k) => k.pk.S,
            );
            expect(keys).toEqual(['tag#calendar:a', 'ns#trip-blocks']);
        });

        it('UnprocessedItems が残っても値を返し、warn を出す。次の読みは外れ', async () => {
            const cache = new SharedCache(client);
            dropWrite = (item) => (item.pk.S as string).endsWith('#1');
            const value = { big: seededBase64(500_000) };
            const load = vi.fn(async () => value);
            expect(await cache.getOrLoad(params({ load }))).toEqual(value);
            expect(warn).toHaveBeenCalled();
            expect(headOf().parts.N).toBe('2');
            await cache.getOrLoad(params({ load }));
            expect(load).toHaveBeenCalledTimes(2);
        });
    });
});
