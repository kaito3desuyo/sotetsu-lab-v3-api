import dayjs from 'dayjs';
import { getBaseDate } from '../../utils/datetime.js';

/**
 * 画面の CDN キャッシュに付けるタグ。形は client と同じにする（client が応答に付けるタグと突き合わせて捨てるため）。
 * calendarId は大文字小文字が揺れるので、全体を小文字にそろえる。
 */
export function calendarCacheTag(calendarId: string): string {
    return `calendar:${calendarId.toLowerCase()}`;
}

/** date は 4 時区切りの運行日（YYYY-MM-DD）。 */
export function sightingDateCacheTag(date: string): string {
    return `sighting-date:${date}`;
}

/** null・空の calendarId は外し、同じタグは 1 つにする。 */
export function calendarCacheTags(
    calendarIds: readonly (string | null | undefined)[],
): string[] {
    const tags = new Set<string>();
    for (const calendarId of calendarIds) {
        if (calendarId) {
            tags.add(calendarCacheTag(calendarId));
        }
    }
    return [...tags];
}

/**
 * 運行日が今日より前の目撃だけをタグにする（過去の日の画面だけが CDN に長く残るため）。
 * 今日以降の画面は CDN に載せないので、失効を呼ぶ必要がない。日の比べ方は getBaseDate（4 時区切り）。
 */
export function pastSightingDateCacheTags(params: {
    sightingTimes: readonly (Date | string)[];
    now: dayjs.Dayjs;
}): string[] {
    const today = getBaseDate(params.now);
    const tags = new Set<string>();
    for (const sightingTime of params.sightingTimes) {
        const baseDate = getBaseDate(dayjs(sightingTime));
        if (baseDate.isBefore(today)) {
            tags.add(sightingDateCacheTag(baseDate.format('YYYY-MM-DD')));
        }
    }
    return [...tags];
}
