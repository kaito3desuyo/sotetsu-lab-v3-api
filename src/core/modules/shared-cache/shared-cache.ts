import { createHash } from 'node:crypto';
import { gunzipSync, gzipSync } from 'node:zlib';
import {
    BatchGetItemCommand,
    DynamoDBClient,
    type AttributeValue,
    type DynamoDBClientConfig,
    PutItemCommand,
    UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import { Injectable, Logger, Optional } from '@nestjs/common';
import { SHARED_CACHE_INVALIDATE_FAILED_MESSAGE } from './shared-cache.log.js';

/**
 * DynamoDB への呼び出しは、api Lambda の timeout（3 秒）を食わないよう、
 * 再試行なし・接続 300ms・応答 1 秒で打ち切る（CdnInvalidation と同じ）。
 * requestTimeout は throwOnRequestTimeout を付けないと警告ログだけで打ち切られない。
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

/** 圧縮後の本体の上限。DynamoDB の項目の上限 400KB に、ほかの属性の分を残す */
export const SHARED_CACHE_MAX_BODY_BYTES = 380 * 1024;
export const SHARED_CACHE_DEFAULT_TTL_SECONDS = 86_400;
/**
 * getOrLoad の始まりからこれ以上経っていたら、置かずに load の結果を返す。
 * 予算を超えていなければ、PutItem（最長 1.3 秒＝接続 0.3 秒＋応答 1 秒）を足しても
 * 1.5 秒＋1.3 秒＝2.8 秒で、Lambda の timeout（3 秒）に収まる。
 * 認証などの前後の処理と、stringify・gzip の時間は、残りの 0.2 秒に収まる目安
 */
export const SHARED_CACHE_PUT_BUDGET_MS = 1_500;

type Item = Record<string, AttributeValue>;

/**
 * 実体（Lambda）をまたいで共有する読み取りキャッシュ（DynamoDB）。
 * 値は JSON にできるものに限る。当たった値と置いた値は、JSON から作り直した新しいものを返す。
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
                ...(params.bypass ? [] : [entryPk]),
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
        if (entry && this.#isHit(entry, versions)) {
            try {
                return JSON.parse(
                    gunzipSync(entry.body.B as Uint8Array).toString('utf8'),
                ) as T;
            } catch (e) {
                this.#warn('値の読み取り', e);
            }
        }

        const loaded = await params.load();

        const elapsed = Date.now() - startedAt;
        if (elapsed > SHARED_CACHE_PUT_BUDGET_MS) {
            this.#logger.warn(
                `共有キャッシュの書き込みを見送りました: ${params.namespace} 経過 ${elapsed}ms`,
            );
            return loaded;
        }

        let json: string | undefined;
        let body: Buffer;
        try {
            json = JSON.stringify(loaded);
            if (json === undefined) {
                return loaded;
            }
            body = gzipSync(json);
        } catch (e) {
            this.#warn('書き込み', e);
            return loaded;
        }
        if (body.byteLength > SHARED_CACHE_MAX_BODY_BYTES) {
            // DB から取ったばかりの値で他に共有されないので、写さずそのまま返す
            this.#warn(
                '書き込み',
                new Error(
                    `値が大きすぎます: ${params.namespace} ${body.byteLength} バイト`,
                ),
            );
            return loaded;
        }

        try {
            await this.#client.send(
                new PutItemCommand({
                    TableName: table,
                    Item: {
                        pk: { S: entryPk },
                        namespace: { S: params.namespace },
                        keyParts: { S: keyParts },
                        body: { B: body },
                        tagVersions: {
                            M: Object.fromEntries(
                                Object.entries(versions).map(([pk, v]) => [
                                    pk,
                                    { N: String(v) },
                                ]),
                            ),
                        },
                        expiresAt: {
                            N: String(
                                Math.floor(Date.now() / 1000) +
                                    (params.ttlSeconds ??
                                        SHARED_CACHE_DEFAULT_TTL_SECONDS),
                            ),
                        },
                    },
                }),
            );
        } catch (e) {
            this.#warn('書き込み', e);
        }
        return JSON.parse(json) as T;
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
            Object.entries(versions).every(
                ([pk, v]) => Number(stored[pk]?.N ?? '0') === v,
            )
        );
    }

    #warn(action: string, e: unknown): void {
        const error = e instanceof Error ? e : new Error(String(e));
        this.#logger.warn(
            `共有キャッシュの${action}に失敗しました: ${error.name} ${error.message}`,
        );
    }
}
