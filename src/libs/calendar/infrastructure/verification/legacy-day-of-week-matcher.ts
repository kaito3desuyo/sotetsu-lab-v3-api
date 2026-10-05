import {
    getDayOfWeek,
    isHoliday,
    isNewYear,
    isSpecialCalendarAvailable,
} from 'src/core/utils/day-of-week';

export interface DayOfWeekFlags {
    sunday: boolean;
    monday: boolean;
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    friday: boolean;
    saturday: boolean;
}

/**
 * v3 CalendarQuery.buildDayOfWeekMatcher が calendar_dates 単独判定へ撤去される前に
 * 持っていた3ハードコード分岐（special→全曜日false / holiday・newyear→日曜扱い /
 * それ以外→当日の曜日）を、撤去前の実装のまま凍結した純粋関数。
 *
 * calendar.query.ts 側の buildDayOfWeekMatcher は本撤去で素の曜日規則のみに
 * 簡素化されるため、この凍結コピーが「真の旧ロジック」を再現する唯一の参照元になる。
 * 等価ゲート（verify-calendar-judgment-equivalence.ts）はこの関数を旧経路として
 * 呼び出し続けることで、撤去後も検証の意味（旧ハードコード ⇔ calendar_dates 由来の
 * 新判定の突き合わせ）を保つ。
 */
export function legacyDayOfWeekMatcher(
    dateString: string,
    format: string,
): (calendar: DayOfWeekFlags) => boolean {
    if (isSpecialCalendarAvailable(dateString, format)) {
        return (calendar) =>
            !calendar.sunday &&
            !calendar.monday &&
            !calendar.tuesday &&
            !calendar.wednesday &&
            !calendar.thursday &&
            !calendar.friday &&
            !calendar.saturday;
    }

    if (isHoliday(dateString, format) || isNewYear(dateString, format)) {
        return (calendar) => calendar.sunday === true;
    }

    const dayOfWeek = getDayOfWeek(dateString, format);
    return (calendar) =>
        (calendar as unknown as Record<string, boolean>)[dayOfWeek] === true;
}
