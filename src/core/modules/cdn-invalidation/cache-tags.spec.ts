import dayjs from 'dayjs';
import {
    calendarCacheTag,
    calendarCacheTags,
    pastSightingDateCacheTags,
    sightingDateCacheTag,
} from './cache-tags.js';

describe('cache-tags', () => {
    it('calendarCacheTag は calendar:<id> を小文字で返す', () => {
        expect(calendarCacheTag('ABC-def')).toBe('calendar:abc-def');
    });

    it('sightingDateCacheTag は sighting-date:<date> を返す', () => {
        expect(sightingDateCacheTag('2026-10-26')).toBe(
            'sighting-date:2026-10-26',
        );
    });

    it('calendarCacheTags は null・空を外し、重複を除く', () => {
        expect(calendarCacheTags(['a', null, 'a', '', 'B', undefined])).toEqual(
            ['calendar:a', 'calendar:b'],
        );
    });

    describe('pastSightingDateCacheTags', () => {
        const now = dayjs('2026-10-27T04:30:00+09:00');

        it('運行日が今日より前の目撃だけをタグにする', () => {
            expect(
                pastSightingDateCacheTags({
                    sightingTimes: [new Date('2026-10-27T03:30:00+09:00')],
                    now,
                }),
            ).toEqual(['sighting-date:2026-10-26']);
        });

        it('今日の目撃はタグにしない', () => {
            expect(
                pastSightingDateCacheTags({
                    sightingTimes: [new Date('2026-10-27T05:00:00+09:00')],
                    now,
                }),
            ).toEqual([]);
        });

        it('4 時前は前日が今日なので、前日の 3 時の目撃はタグにしない', () => {
            expect(
                pastSightingDateCacheTags({
                    sightingTimes: [new Date('2026-10-27T03:00:00+09:00')],
                    now: dayjs('2026-10-27T03:30:00+09:00'),
                }),
            ).toEqual([]);
        });

        it('同じ日が複数あっても、タグは 1 つ', () => {
            expect(
                pastSightingDateCacheTags({
                    sightingTimes: [
                        '2026-10-27T03:30:00+09:00',
                        new Date('2026-10-26T10:00:00+09:00'),
                    ],
                    now,
                }),
            ).toEqual(['sighting-date:2026-10-26']);
        });
    });
});
