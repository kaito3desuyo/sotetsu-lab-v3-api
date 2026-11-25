import { selectionCacheKey, wantsFreshRead } from './bypass.js';

describe('wantsFreshRead', () => {
    it.each([
        [{ cacheControl: 'no-cache' }],
        [{ cacheControl: 'max-age=0, no-cache' }],
        [{ pragma: 'no-cache' }],
    ])('no-cache が付いていれば true: %o', (headers) => {
        expect(wantsFreshRead(headers)).toBe(true);
    });

    it.each([
        [{}],
        [{ cacheControl: 'max-age=0' }],
        [{ cacheControl: 'no-store' }],
    ])('付いていなければ false: %o', (headers) => {
        expect(wantsFreshRead(headers)).toBe(false);
    });
});

describe('selectionCacheKey', () => {
    it('fields のキーの順と項目の並びが違っても同じ', () => {
        expect(selectionCacheKey({ fields: { time: 'b,a', trip: 'x' } })).toBe(
            selectionCacheKey({ fields: { trip: 'x', time: 'a,b' } }),
        );
    });

    it('include の並びが違っても同じ', () => {
        expect(selectionCacheKey({ include: 'trips.times,trips' })).toBe(
            selectionCacheKey({ include: 'trips,trips.times' }),
        );
    });

    it('中身が違えば違う', () => {
        expect(selectionCacheKey({ include: 'trips' })).not.toBe(
            selectionCacheKey({ fields: { trip: 'trips' } }),
        );
    });

    it('何も無ければ空文字', () => {
        expect(selectionCacheKey({})).toBe('');
        expect(selectionCacheKey({ include: undefined, fields: null })).toBe(
            '',
        );
    });
});
