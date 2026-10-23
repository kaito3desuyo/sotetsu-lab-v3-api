import { FeatureFlags } from './feature-flags.js';
import type { FeatureFlagModel } from './feature-flag.model.js';

describe('FeatureFlags', () => {
    const getMany = vi.fn();
    const qb = {
        select: vi.fn().mockReturnThis(),
        getMany,
    };
    const repository = { createQueryBuilder: vi.fn(() => qb) };
    let flags: FeatureFlags;

    const rows = (list: Array<[string, boolean]>) =>
        list.map(([key, enabled]) => ({ key, enabled }) as FeatureFlagModel);

    beforeEach(() => {
        vi.useFakeTimers();
        vi.clearAllMocks();
        qb.select.mockReturnThis();
        repository.createQueryBuilder.mockReturnValue(qb);
        getMany.mockResolvedValue(rows([['registered_only_posting', true]]));
        flags = new FeatureFlags(repository as never);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('行があって enabled なら true', async () => {
        await expect(flags.isEnabled('registered_only_posting')).resolves.toBe(
            true,
        );
    });

    it('enabled: false の行は false', async () => {
        getMany.mockResolvedValue(rows([['registered_only_posting', false]]));
        await expect(flags.isEnabled('registered_only_posting')).resolves.toBe(
            false,
        );
    });

    it('行が無いキーは false', async () => {
        await expect(flags.isEnabled('unknown')).resolves.toBe(false);
    });

    it('60 秒以内の呼び出しは DB を 1 回しか引かない', async () => {
        await flags.isEnabled('registered_only_posting');
        await flags.isEnabled('registered_only_posting');
        await flags.all();
        expect(getMany).toHaveBeenCalledTimes(1);
    });

    it('61 秒たつと引き直す', async () => {
        await flags.isEnabled('registered_only_posting');
        vi.advanceTimersByTime(61_000);
        getMany.mockResolvedValue(rows([['registered_only_posting', false]]));
        await expect(flags.isEnabled('registered_only_posting')).resolves.toBe(
            false,
        );
        expect(getMany).toHaveBeenCalledTimes(2);
    });

    it('同時に来た読み込みは 1 本の問い合わせを共有する', async () => {
        await Promise.all([
            flags.isEnabled('registered_only_posting'),
            flags.isEnabled('other'),
            flags.all(),
        ]);
        expect(getMany).toHaveBeenCalledTimes(1);
    });

    it('DB が reject したら isEnabled も reject し、失敗は覚えず次で引き直す', async () => {
        getMany.mockRejectedValueOnce(new Error('db down'));
        await expect(flags.isEnabled('registered_only_posting')).rejects.toThrow(
            'db down',
        );
        await expect(flags.isEnabled('registered_only_posting')).resolves.toBe(
            true,
        );
        expect(getMany).toHaveBeenCalledTimes(2);
    });

    it('all() は { key: enabled } の形で全行を返す', async () => {
        getMany.mockResolvedValue(
            rows([
                ['registered_only_posting', true],
                ['other', false],
            ]),
        );
        await expect(flags.all()).resolves.toEqual({
            registered_only_posting: true,
            other: false,
        });
    });
});
