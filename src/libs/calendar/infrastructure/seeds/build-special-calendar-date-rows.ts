import dayjs from 'dayjs';
import {
    CALENDAR_DATE_EXCEPTION_TYPE_ADDED,
    CALENDAR_DATE_EXCEPTION_TYPE_REMOVED,
} from '../models/calendar-date.model';
import {
    CalendarDateSeedRow,
    CalendarValidityRow,
    isWithinCalendarValidity,
} from './build-holiday-calendar-date-rows';

type WeekdayKey =
    | 'sunday'
    | 'monday'
    | 'tuesday'
    | 'wednesday'
    | 'thursday'
    | 'friday'
    | 'saturday';

/**
 * 既存の `specialCalendarDays`（api `core/utils/day-of-week.ts`）の日付を calendar_dates へ移行する純関数。
 *
 * 移行元のロジック（`CalendarQuery.buildDayOfWeekMatcher`）は、特別日について
 * 全カレンダーに対して一律「曜日フラグが全て false のカレンダーのみ運行」という
 * 判定を適用する（実際の曜日が何であるかに関わらず、通常カレンダーは一切運行しない）。
 * これを calendar_dates で再現するには2種類の行が必要:
 * - 「全曜日フラグ false」のカレンダー（特別ダイヤ専用） → type1（追加）
 * - それ以外の通常カレンダーのうち、実際の曜日フラグが true で
 *   「曜日規則だけなら運行してしまう」ものだけ → type2（除外）
 *   （フラグが false のカレンダーは元々運行しないため除外行は不要）
 *
 * 除外行を発行しないと、例えば土休日ダイヤ（sunday/saturday=true）の
 * カレンダーが実際に土曜日である特別ダイヤの日に、曜日規則だけで
 * 誤って運行判定されてしまう（T7.2 の等価検証で検出）。
 */
export function buildSpecialCalendarDateRows(params: {
    specialDates: string[];
    calendars: CalendarValidityRow[];
}): CalendarDateSeedRow[] {
    const { specialDates, calendars } = params;

    const rows: CalendarDateSeedRow[] = [];

    for (const date of specialDates) {
        const dayOfWeek = getWeekdayKey(date);

        for (const calendar of calendars) {
            if (!isWithinCalendarValidity(calendar, date)) continue;

            if (isAllWeekdayFlagsFalse(calendar)) {
                rows.push({
                    calendarId: calendar.id,
                    date,
                    exceptionType: CALENDAR_DATE_EXCEPTION_TYPE_ADDED,
                    memo: '特別ダイヤ（specialCalendarDays 移行）',
                });
                continue;
            }

            if (calendar[dayOfWeek]) {
                rows.push({
                    calendarId: calendar.id,
                    date,
                    exceptionType: CALENDAR_DATE_EXCEPTION_TYPE_REMOVED,
                    memo: '特別ダイヤ（specialCalendarDays 移行・通常カレンダーの運休）',
                });
            }
        }
    }

    return rows;
}

function getWeekdayKey(date: string): WeekdayKey {
    return dayjs(date, 'YYYY-MM-DD').format('dddd').toLowerCase() as WeekdayKey;
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
