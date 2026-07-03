import { CALENDAR_DATE_EXCEPTION_TYPE_ADDED } from '../models/calendar-date.model';
import {
    CalendarDateSeedRow,
    CalendarValidityRow,
    isWithinCalendarValidity,
} from './build-holiday-calendar-date-rows';

/**
 * 既存の `specialCalendarDays`（api `core/utils/day-of-week.ts`）の日付を calendar_dates へ移行する純関数。
 *
 * 移行元のロジック（`CalendarQuery.buildDayOfWeekMatcher`）は、特別日について
 * 「曜日フラグが全て false のカレンダー」を優先マッチさせている。
 * 通常運用のカレンダーは必ずいずれかの曜日フラグが true のため、
 * 「全曜日フラグ false」のカレンダーは特別ダイヤ専用カレンダーとして一意に識別できる
 * （= 通常カレンダーとの衝突が起きないため type2 の除外行は不要で、type1 の追加のみで足りる）。
 */
export function buildSpecialCalendarDateRows(params: {
    specialDates: string[];
    calendars: CalendarValidityRow[];
}): CalendarDateSeedRow[] {
    const { specialDates, calendars } = params;

    const rows: CalendarDateSeedRow[] = [];

    for (const date of specialDates) {
        for (const calendar of calendars) {
            if (!isWithinCalendarValidity(calendar, date)) continue;
            if (!isAllWeekdayFlagsFalse(calendar)) continue;

            rows.push({
                calendarId: calendar.id,
                date,
                exceptionType: CALENDAR_DATE_EXCEPTION_TYPE_ADDED,
                memo: '特別ダイヤ（specialCalendarDays 移行）',
            });
        }
    }

    return rows;
}

function isAllWeekdayFlagsFalse(
    calendar: Pick<
        CalendarValidityRow,
        | 'sunday'
        | 'monday'
        | 'tuesday'
        | 'wednesday'
        | 'thursday'
        | 'friday'
        | 'saturday'
    >,
): boolean {
    return (
        !calendar.sunday &&
        !calendar.monday &&
        !calendar.tuesday &&
        !calendar.wednesday &&
        !calendar.thursday &&
        !calendar.friday &&
        !calendar.saturday
    );
}
