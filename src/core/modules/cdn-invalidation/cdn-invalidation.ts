import {
    CloudFrontClient,
    type CloudFrontClientConfig,
    CreateInvalidationCommand,
} from '@aws-sdk/client-cloudfront';
import { Injectable, Logger, Optional } from '@nestjs/common';

/**
 * 失効は書き込みの応答の前に await される（api Lambda の timeout は 3 秒）。
 * 詰まった失効が書き込み済みの応答を 504 にしないよう、再試行なし・接続 300ms・応答 1 秒で打ち切る。
 * requestTimeout は throwOnRequestTimeout を付けないと警告ログだけで打ち切られない。
 * CloudFront の API は us-east-1 にしか無いので、region を固定する。
 */
export const CDN_INVALIDATION_CLIENT_CONFIG = {
    region: 'us-east-1',
    maxAttempts: 1,
    requestHandler: {
        connectionTimeout: 300,
        requestTimeout: 1000,
        throwOnRequestTimeout: true,
    },
} as const satisfies CloudFrontClientConfig;

/**
 * 書き込みで古くなった画面の CDN キャッシュを、タグを指定して捨てる。
 * タグは `#` を頭に付けたパスとして CloudFront の失効に渡す（client が応答に付けたタグと突き合わせて捨てられる）。
 * 失敗しても書き込みは成功のまま返したいので、例外を投げずにログだけ残す。
 * 配信の ID（CDN_DISTRIBUTION_ID）が無い（テスト・手元）か、タグが無いなら何もしない。
 */
@Injectable()
export class CdnInvalidation {
    readonly #logger = new Logger(CdnInvalidation.name);
    readonly #client: CloudFrontClient;

    constructor(@Optional() client?: CloudFrontClient) {
        this.#client =
            client ?? new CloudFrontClient(CDN_INVALIDATION_CLIENT_CONFIG);
    }

    async invalidate(params: { tags: readonly string[] }): Promise<void> {
        // Set・env の読み取りも含め、何が起きても reject しない（書き込みを失敗にしないため）
        try {
            const distributionId = process.env.CDN_DISTRIBUTION_ID;
            if (!distributionId) {
                return;
            }
            const tags = [...new Set(params.tags)];
            if (tags.length === 0) {
                return;
            }

            await this.#client.send(
                new CreateInvalidationCommand({
                    DistributionId: distributionId,
                    InvalidationBatch: {
                        // CallerReference は 128 文字までなので、タグが多くても切る
                        CallerReference:
                            `${Date.now()}-${tags.join(',')}`.slice(0, 128),
                        Paths: {
                            Quantity: tags.length,
                            Items: tags.map((tag) => `#${tag}`),
                        },
                    },
                }),
            );
        } catch (e) {
            const error = e instanceof Error ? e : new Error(String(e));
            this.#logger.warn(
                `CDN の失効に失敗しました: ${error.name} ${error.message}`,
            );
        }
    }
}
