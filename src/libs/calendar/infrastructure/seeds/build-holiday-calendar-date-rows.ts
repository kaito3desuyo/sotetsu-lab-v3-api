import {
    CALENDAR_DATE_EXCEPTION_TYPE_ADDED,
    CALENDAR_DATE_EXCEPTION_TYPE_REMOVED,
    CalendarDateExceptionType,
} from '../models/calendar-date.model';

export interface CalendarValidityRow {
    id: string;
    /** YYYY-MM-DD */
    startDate: string | null;
    /** YYYY-MM-DD（null は無期限） */
    endDate: string | null;
    sunday: boolean;
    monday: boolean;
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    friday: boolean;
    saturday: boolean;
}

export interface CalendarDateSeedRow {
    calendarId: string;
    /** YYYY-MM-DD */
    date: string;
    exceptionType: CalendarDateExceptionType;
    memo: string;
}

/**
 * 祝日一覧 × カレンダー一覧から、calendar_dates へ upsert すべき行を組み立てる純関数。
 *
 * - 休日ダイヤ系（sunday=true）→ type1（追加・運行させる）
 * - 平日ダイヤ系（monday〜friday のいずれか true）→ type2（除外・運休させる）
 * - どちらにも該当しない（土曜専用カレンダー等）カレンダーは対象外
 * - 各カレンダーの有効期間（startDate〜endDate、endDate null は無期限）と交差しない祝日は除外
 * - from/to を指定した場合はその範囲外の祝日も除外する
 */
export function buildHolidayCalendarDateRows(params: {
    holidayDates: string[];
    calendars: CalendarValidityRow[];
    from?: string;
    to?: string;
}): CalendarDateSeedRow[] {
    const { holidayDates, calendars, from, to } = params;

    const filteredHolidays = holidayDates.filter((date) => {
        if (from && date < from) return false;
        if (to && date > to) return false;
        return true;
    });

    const rows: CalendarDateSeedRow[] = [];

    for (const date of filteredHolidays) {
        for (const calendar of calendars) {
            if (!isWithinCalendarValidity(calendar, date)) continue;

            if (calendar.sunday) {
                rows.push({
                    calendarId: calendar.id,
                    date,
                    exceptionType: CALENDAR_DATE_EXCEPTION_TYPE_ADDED,
                    memo: '祝日',
                });
            } else if (
                calendar.monday ||
                calendar.tuesday ||
                calendar.wednesday ||
                calendar.thursday ||
                calendar.friday
            ) {
                rows.push({
                    calendarId: calendar.id,
                    date,
                    exceptionType: CALENDAR_DATE_EXCEPTION_TYPE_REMOVED,
                    memo: '祝日',
                });
            }
        }
    }

    return rows;
}

export function isWithinCalendarValidity(
    calendar: Pick<CalendarValidityRow, 'startDate' | 'endDate'>,
    date: string,
): boolean {
    if (calendar.startDate && date < calendar.startDate) return false;
    if (calendar.endDate && date > calendar.endDate) return false;
    return true;
}
