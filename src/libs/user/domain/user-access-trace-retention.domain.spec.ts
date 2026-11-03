import { UserAccessTraceRetention } from './user-access-trace-retention.domain.js';

describe('UserAccessTraceRetention', () => {
    it('手がかりを残すのは 90 日', () => {
        expect(UserAccessTraceRetention.DAYS).toBe(90);
    });

    it('境目は now のちょうど 90 日前', () => {
        expect(
            UserAccessTraceRetention.cutoff(
                new Date('2026-11-03T00:00:00.000Z'),
            ),
        ).toEqual(new Date('2026-08-05T00:00:00.000Z'));
    });

    it('時刻の端数も保つ', () => {
        expect(
            UserAccessTraceRetention.cutoff(
                new Date('2026-11-03T12:34:56.789Z'),
            ),
        ).toEqual(new Date('2026-08-05T12:34:56.789Z'));
    });
});
