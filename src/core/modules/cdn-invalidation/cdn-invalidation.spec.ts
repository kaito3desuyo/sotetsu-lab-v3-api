import {
    CreateInvalidationCommand,
    type CloudFrontClient,
} from '@aws-sdk/client-cloudfront';
import { Logger } from '@nestjs/common';
import {
    CDN_INVALIDATION_CLIENT_CONFIG,
    CdnInvalidation,
} from './cdn-invalidation.js';

describe('CdnInvalidation', () => {
    const send = vi.fn();
    const client = { send } as unknown as CloudFrontClient;
    const ORIGINAL = process.env.CDN_DISTRIBUTION_ID;
    let warn: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        send.mockReset();
        warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
        process.env.CDN_DISTRIBUTION_ID = 'DIST123';
    });

    afterEach(() => {
        warn.mockRestore();
    });

    afterAll(() => {
        if (ORIGINAL === undefined) {
            delete process.env.CDN_DISTRIBUTION_ID;
        } else {
            process.env.CDN_DISTRIBUTION_ID = ORIGINAL;
        }
    });

    it('タグを # 付きのパスにして、重複を除いて 1 回の失効で頼む', async () => {
        send.mockResolvedValue({});
        await new CdnInvalidation(client).invalidate({
            tags: ['calendar:a', 'calendar:a', 'sighting-date:2026-10-01'],
        });

        expect(send).toHaveBeenCalledTimes(1);
        const command = send.mock.calls[0][0] as CreateInvalidationCommand;
        expect(command.input.DistributionId).toBe('DIST123');
        expect(command.input.InvalidationBatch?.Paths).toEqual({
            Quantity: 2,
            Items: ['#calendar:a', '#sighting-date:2026-10-01'],
        });
        expect(command.input.InvalidationBatch?.CallerReference).toEqual(
            expect.any(String),
        );
        expect(
            command.input.InvalidationBatch?.CallerReference?.length,
        ).toBeGreaterThan(0);
    });

    it('CallerReference は 128 文字以内', async () => {
        send.mockResolvedValue({});
        await new CdnInvalidation(client).invalidate({
            tags: Array.from({ length: 50 }, (_, i) => `calendar:tag-${i}`),
        });
        const command = send.mock.calls[0][0] as CreateInvalidationCommand;
        expect(
            command.input.InvalidationBatch?.CallerReference?.length,
        ).toBeLessThanOrEqual(128);
    });

    it('配信の ID が空なら呼ばない', async () => {
        process.env.CDN_DISTRIBUTION_ID = '';
        await new CdnInvalidation(client).invalidate({ tags: ['calendar:a'] });
        expect(send).not.toHaveBeenCalled();
    });

    it('タグが 0 個なら呼ばない', async () => {
        await new CdnInvalidation(client).invalidate({ tags: [] });
        expect(send).not.toHaveBeenCalled();
    });

    it('呼び出しが失敗しても例外を投げず、警告を 1 回残す', async () => {
        send.mockRejectedValue(new Error('AccessDenied'));
        await expect(
            new CdnInvalidation(client).invalidate({ tags: ['calendar:a'] }),
        ).resolves.toBeUndefined();
        expect(warn).toHaveBeenCalledTimes(1);
    });

    it('タグの読み取り（Set を作る前）で投げられても例外を投げず、警告を 1 回残し、呼び出しはしない', async () => {
        const brokenTags = {
            [Symbol.iterator]() {
                throw new Error('broken iterable');
            },
        } as unknown as readonly string[];

        await expect(
            new CdnInvalidation(client).invalidate({ tags: brokenTags }),
        ).resolves.toBeUndefined();
        expect(warn).toHaveBeenCalledTimes(1);
        expect(send).not.toHaveBeenCalled();
    });

    it('既定のクライアントは us-east-1 で、再試行せず、接続 300ms・応答 1 秒で打ち切る', () => {
        expect(CDN_INVALIDATION_CLIENT_CONFIG).toEqual({
            region: 'us-east-1',
            maxAttempts: 1,
            requestHandler: {
                connectionTimeout: 300,
                requestTimeout: 1000,
                throwOnRequestTimeout: true,
            },
        });
    });
});
