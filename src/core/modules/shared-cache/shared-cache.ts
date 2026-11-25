import { createHash, randomUUID } from 'node:crypto';
import {
    brotliCompressSync,
    brotliDecompressSync,
    constants as zlibConstants,
} from 'node:zlib';
import {
    BatchGetItemCommand,
    BatchWriteItemCommand,
    DynamoDBClient,
    type AttributeValue,
    type DynamoDBClientConfig,
    UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import { Injectable, Logger, Optional } from '@nestjs/common';
import { SHARED_CACHE_INVALIDATE_FAILED_MESSAGE } from './shared-cache.log.js';

/**
 * DynamoDB への呼び出しは、api Lambda の timeout（3 秒）を食わないよう、
 * 再試行なし・接続 300ms・応答 1 秒で打ち切る（CdnInvalidation と同じ）。
 * requestTimeout は throwOnRequestTimeout を付けないと警告ログだけで打ち切られない。
 * requestTimeout は応答のヘッダーが届くと止まるので、本体の受け取りまでは、
 * 各 send に付ける abortSignal（SHARED_CACHE_SEND_TIMEOUT_MS）で打ち切る。
 * region は Lambda が入れる AWS_REGION から決まる。
 */
export const SHARED_CACHE_CLIENT_CONFIG = {
    maxAttempts: 1,
    requestHandler: {
        connectionTimeout: 300,
        requestTimeout: 1000,
        throwOnRequestTimeout: true,
    },
} as const satisfies DynamoDBClientConfig;

/** 各 send の全体（要求の送信から応答の本体の受け取りまで）の期限。requestTimeout と同じ 1 秒 */
export const SHARED_CACHE_SEND_TIMEOUT_MS = 1_000;

/**
 * 圧縮後の本体を分ける 1 切れの大きさ。DynamoDB の項目の上限 400KB に、ほかの属性の分を残す。
 * 分けて置けるのは最大 SHARED_CACHE_MAX_PARTS 切れ（350KB × 4 = 1.4MB）まで
 */
export const SHARED_CACHE_PART_BYTES = 350 * 1024;
export const SHARED_CACHE_MAX_PARTS = 4;
export const SHARED_CACHE_DEFAULT_TTL_SECONDS = 86_400;
/**
 * getOrLoad の始まりからこれ以上経っていたら、置かずに load の結果を返す。
 * 経過は load・stringify・brotli・写しの parse のあとで測る。
 * 予算を超えていなければ、BatchWriteItem（abortSignal で本体の受け取りまで含め最長 1 秒）を足しても
 * 1.5 秒＋1 秒＝2.5 秒で、Lambda の timeout（3 秒）に収まる。
 * 認証などの前後の処理は、残りの 0.5 秒に収まる目安
 */
export const SHARED_CACHE_PUT_BUDGET_MS = 1_500;

type Item = Record<string, AttributeValue>;

/** Uint8Array をコピーせずに Buffer として見る */
const view = (x: Uint8Array): Buffer =>
    Buffer.from(x.buffer, x.byteOffset, x.byteLength);

/**
 * 実体（Lambda）をまたいで共有する読み取りキャッシュ（DynamoDB）。
 * 値は JSON にできるものに限る。値は brotli で縮め、350KB ごとに最大 4 項目
 * （先頭 `entry#…` と続き `entry#…#1`〜`#3`）に分けて置く。先頭の `parts` と `writeId` で、
 * 続きがそろい、同じ書き込みのものだけをつなぐ（欠けていたり、別の書き込みが混ざっていたら外れ）。
 * 当たった値と置いた値は、JSON から作り直した新しいものを返す。
 * 置かなかったとき（予算超過・大きすぎ・stringify 失敗）は、load の結果をそのまま返す（DB から取ったばかりで、ほかに共有されない）。
 * 捨てるときは、タグ・名前空間の項目の版を上げる。値は、置いたときの版が今と同じなら当たる。
 * 失敗しても応答は変えない（読めなければ load、置けなくても値を返す、捨てるのに失敗しても reject しない）。
 * テーブル名（SHARED_CACHE_TABLE_NAME）が空なら、load を呼ぶだけ。
 */
@Injectable()
export class SharedCache {
    readonly #logger = new Logger(SharedCache.name);
    readonly #client: DynamoDBClient;

    constructor(@Optional() client?: DynamoDBClient) {
        this.#client = client ?? new DynamoDBClient(SHARED_CACHE_CLIENT_CONFIG);
    }

    async getOrLoad<T>(params: {
        namespace: string;
        key: readonly (string | number)[];
        tags: readonly string[];
        ttlSeconds?: number;
        bypass?: boolean;
        load: () => Promise<T>;
    }): Promise<T> {
        const table = process.env.SHARED_CACHE_TABLE_NAME;
        if (!table) {
            return params.load();
        }

        const startedAt = Date.now();
        const keyParts = JSON.stringify(params.key);
        const entryPk = `entry#${params.namespace}#${createHash('sha256')
            .update(keyParts)
            .digest('hex')}`;
        const versionPks = [
            ...new Set(params.tags.map((tag) => `tag#${tag}`)),
            `ns#${params.namespace}`,
        ];

        let items: Map<string, Item>;
        try {
            items = await this.#batchGet(table, [
                ...(params.bypass
                    ? []
                    : [
                          entryPk,
                          ...Array.from(
                              { length: SHARED_CACHE_MAX_PARTS - 1 },
                              (_, i) => `${entryPk}#${i + 1}`,
                          ),
                      ]),
                ...versionPks,
            ]);
        } catch (e) {
            this.#warn('読み出し', e);
            return params.load();
        }

        const versions = Object.fromEntries(
            versionPks.map((pk) => [
                pk,
                Number(items.get(pk)?.version?.N ?? '0'),
            ]),
        );

        const entry = params.bypass ? undefined : items.get(entryPk);
        const stored = entry && this.#isHit(entry, versions);
        const cachedBody = stored
            ? this.#joinParts(entryPk, entry, items)
            : undefined;
        if (cachedBody) {
            try {
                return JSON.parse(
                    brotliDecompressSync(cachedBody).toString('utf8'),
                ) as T;
            } catch (e) {
                this.#warn('値の読み取り', e);
            }
        }

        const loaded = await params.load();

        let json: string | undefined;
        let body: Buffer;
        try {
            json = JSON.stringify(loaded);
            if (json === undefined) {
                return loaded;
            }
            body = brotliCompressSync(json, {
                params: {
                    [zlibConstants.BROTLI_PARAM_QUALITY]: 6,
                    [zlibConstants.BROTLI_PARAM_SIZE_HINT]:
                        Buffer.byteLength(json),
                },
            });
        } catch (e) {
            this.#warn('書き込み', e);
            return loaded;
        }
        if (
            body.byteLength >
            SHARED_CACHE_PART_BYTES * SHARED_CACHE_MAX_PARTS
        ) {
            // DB から取ったばかりの値で他に共有されないので、写さずそのまま返す
            this.#warn(
                '書き込み',
                new Error(
                    `値が大きすぎます: ${params.namespace} ${body.byteLength} バイト`,
                ),
            );
            return loaded;
        }

        // 返す写しも先に作る（失敗しても書き込みは済んでいないので、load の結果を返す）
        let copy: T;
        try {
            copy = JSON.parse(json) as T;
        } catch (e) {
            this.#warn('書き込み', e);
            return loaded;
        }

        // stringify・brotli・写しの時間も含めて、始まりからの経過で見る
        const elapsed = Date.now() - startedAt;
        if (elapsed > SHARED_CACHE_PUT_BUDGET_MS) {
            this.#logger.warn(
                `共有キャッシュの書き込みを見送りました: ${params.namespace} 経過 ${elapsed}ms`,
            );
            return loaded;
        }

        const parts = Math.max(
            1,
            Math.ceil(body.byteLength / SHARED_CACHE_PART_BYTES),
        );
        const writeId = randomUUID();
        const expiresAt = {
            N: String(
                Math.floor(Date.now() / 1000) +
                    (params.ttlSeconds ?? SHARED_CACHE_DEFAULT_TTL_SECONDS),
            ),
        };
        const slice = (i: number) =>
            body.subarray(
                i * SHARED_CACHE_PART_BYTES,
                (i + 1) * SHARED_CACHE_PART_BYTES,
            );
        const putItems: Item[] = [
            {
                pk: { S: entryPk },
                namespace: { S: params.namespace },
                keyParts: { S: keyParts },
                body: { B: slice(0) },
                parts: { N: String(parts) },
                writeId: { S: writeId },
                tagVersions: {
                    M: Object.fromEntries(
                        Object.entries(versions).map(([pk, v]) => [
                            pk,
                            { N: String(v) },
                        ]),
                    ),
                },
                expiresAt,
            },
            ...Array.from({ length: parts - 1 }, (_, i) => ({
                pk: { S: `${entryPk}#${i + 1}` },
                body: { B: slice(i + 1) },
                writeId: { S: writeId },
                expiresAt,
            })),
        ];

        try {
            const result = await this.#client.send(
                new BatchWriteItemCommand({
                    RequestItems: {
                        [table]: putItems.map((Item) => ({
                            PutRequest: { Item },
                        })),
                    },
                }),
                {
                    abortSignal: AbortSignal.timeout(
                        SHARED_CACHE_SEND_TIMEOUT_MS,
                    ),
                },
            );
            if (Object.keys(result.UnprocessedItems ?? {}).length > 0) {
                this.#warn(
                    '書き込み',
                    new Error('UnprocessedItems が残りました'),
                );
            }
        } catch (e) {
            this.#warn('書き込み', e);
        }
        return copy;
    }

    /** 全ての更新が成功したときだけ true。失敗しても reject しない */
    async invalidate(params: { tags: readonly string[] }): Promise<boolean> {
        return this.#bump([...new Set(params.tags)].map((tag) => `tag#${tag}`));
    }

    async invalidateNamespace(params: { namespace: string }): Promise<boolean> {
        return this.#bump([`ns#${params.namespace}`]);
    }

    async #bump(pks: readonly string[]): Promise<boolean> {
        // env の読み取りも含め、何が起きても reject しない（書き込みを失敗にしないため）
        try {
            const table = process.env.SHARED_CACHE_TABLE_NAME;
            if (!table || pks.length === 0) {
                return false;
            }
            await Promise.all(
                pks.map((pk) =>
                    this.#client.send(
                        new UpdateItemCommand({
                            TableName: table,
                            Key: { pk: { S: pk } },
                            UpdateExpression: 'ADD version :one',
                            ExpressionAttributeValues: { ':one': { N: '1' } },
                        }),
                        {
                            abortSignal: AbortSignal.timeout(
                                SHARED_CACHE_SEND_TIMEOUT_MS,
                            ),
                        },
                    ),
                ),
            );
            return true;
        } catch (e) {
            const error = e instanceof Error ? e : new Error(String(e));
            this.#logger.warn(
                `${SHARED_CACHE_INVALIDATE_FAILED_MESSAGE}: ${error.name} ${error.message}`,
            );
            return false;
        }
    }

    async #batchGet(
        table: string,
        pks: readonly string[],
    ): Promise<Map<string, Item>> {
        const result = await this.#client.send(
            new BatchGetItemCommand({
                RequestItems: {
                    [table]: { Keys: pks.map((pk) => ({ pk: { S: pk } })) },
                },
            }),
            { abortSignal: AbortSignal.timeout(SHARED_CACHE_SEND_TIMEOUT_MS) },
        );
        // 読み残しがあると版を取り違えるので、読み出しの失敗として扱う
        if (Object.keys(result.UnprocessedKeys ?? {}).length > 0) {
            throw new Error('UnprocessedKeys が残りました');
        }
        const items = new Map<string, Item>();
        for (const item of result.Responses?.[table] ?? []) {
            if (item.pk?.S) {
                items.set(item.pk.S, item);
            }
        }
        return items;
    }

    #isHit(entry: Item, versions: Record<string, number>): boolean {
        // 期限が無い・数でない値は外れ（NaN との比較は false になるので、当たる側で書く）
        if (!(Number(entry.expiresAt?.N) > Date.now() / 1000)) {
            return false;
        }
        const stored = entry.tagVersions?.M ?? {};
        return (
            entry.body?.B !== undefined &&
            entry.writeId?.S !== undefined &&
            this.#partsOf(entry) !== undefined &&
            Object.entries(versions).every(
                ([pk, v]) => Number(stored[pk]?.N ?? '0') === v,
            )
        );
    }

    /** `parts` が 1〜SHARED_CACHE_MAX_PARTS の整数のときだけ返す（parts の無い古い項目は undefined） */
    #partsOf(entry: Item): number | undefined {
        const parts = Number(entry.parts?.N);
        return Number.isInteger(parts) &&
            parts >= 1 &&
            parts <= SHARED_CACHE_MAX_PARTS
            ? parts
            : undefined;
    }

    /** 続きがそろい、どれも先頭と同じ writeId のときだけ、順につないだ本体を返す */
    #joinParts(
        entryPk: string,
        entry: Item,
        items: Map<string, Item>,
    ): Buffer | undefined {
        const parts = this.#partsOf(entry);
        if (parts === undefined) {
            return undefined;
        }
        const buffers = [view(entry.body.B as Uint8Array)];
        for (let i = 1; i < parts; i++) {
            const rest = items.get(`${entryPk}#${i}`);
            const restBody = rest?.body?.B;
            if (
                restBody === undefined ||
                rest?.writeId?.S !== entry.writeId.S
            ) {
                return undefined;
            }
            buffers.push(view(restBody));
        }
        return Buffer.concat(buffers);
    }

    #warn(action: string, e: unknown): void {
        const error = e instanceof Error ? e : new Error(String(e));
        this.#logger.warn(
            `共有キャッシュの${action}に失敗しました: ${error.name} ${error.message}`,
        );
    }
}
