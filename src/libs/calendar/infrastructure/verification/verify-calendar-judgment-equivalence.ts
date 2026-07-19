import dayjs from 'dayjs';
import { getDayOfWeek, newYearDays, specialCalendarDays } from 'src/core/utils/day-of-week';
import { CalendarDateExceptionType } from '../models/calendar-date.model';
import { resolveCalendarIdBySpecificDate } from '../queries/resolve-calendar-id-by-specific-date';
import {
    buildHolidayCalendarDateRows,
    CalendarDateSeedRow,
    CalendarValidityRow,
    isWithinCalendarValidity,
} from '../seeds/build-holiday-calendar-date-rows';
import { buildNewYearCalendarDateRows } from '../seeds/build-newyear-calendar-date-rows';
import { buildSpecialCalendarDateRows } from '../seeds/build-special-calendar-date-rows';
import { legacyDayOfWeekMatcher } from './legacy-day-of-week-matcher';

const DATE_FORMAT = 'YYYY-MM-DD';

/**
 * 旧経路（撤去済みの3ハードコード判定を凍結した legacyDayOfWeekMatcher）による
 * 「その日そのカレンダーが運行するか」。calendar_dates は一切参照しない
 * （v3 CalendarQuery が calendar_dates 単独判定へ撤去される前に行っていた判定と
 * 同一：有効期間チェック + buildDayOfWeekMatcher の3分岐）。
 *
 * legacyDayOfWeekMatcher は撤去前の CalendarQuery.buildDayOfWeekMatcher の実装を
 * そのまま切り出した凍結コピーであり、撤去後もこのゲートが「真の旧ロジック」に
 * 対して検証し続けられるようにするための唯一の参照元。
 */
export function legacyJudgment(params: {
    date: string;
    calendar: CalendarValidityRow;
}): boolean {
    const { date, calendar } = params;

    if (!isWithinCalendarValidity(calendar, date)) {
        return false;
    }

    const matcher = legacyDayOfWeekMatcher(date, DATE_FORMAT);
    return matcher(calendar);
}

/**
 * 新経路（calendar_dates 由来）による「その日そのカレンダーが運行するか」。
 *
 * 曜日規則はハードコード分岐を持たない素の曜日フラグのみを用い、
 * ADDED/REMOVED の合成は resolveCalendarIdBySpecificDate（本番の合成ロジック）を
 * 単一カレンダー候補で呼び出すことでそのまま再利用する。
 */
export function newJudgment(params: {
    date: string;
    calendar: CalendarValidityRow;
    calendarDateRows: CalendarDateSeedRow[];
}): boolean {
    const { date, calendar, calendarDateRows } = params;

    if (!isWithinCalendarValidity(calendar, date)) {
        return false;
    }

    const dayOfWeek = getDayOfWeek(date, DATE_FORMAT);
    const dayOfWeekMatches =
        (calendar as unknown as Record<string, boolean>)[dayOfWeek] === true;

    const exceptions: {
        calendarId: string;
        exceptionType: CalendarDateExceptionType;
    }[] = calendarDateRows
        .filter((row) => row.calendarId === calendar.id && row.date === date)
        .map((row) => ({
            calendarId: row.calendarId,
            exceptionType: row.exceptionType,
        }));

    const resolvedId = resolveCalendarIdBySpecificDate({
        candidates: [{ id: calendar.id, dayOfWeekMatches }],
        exceptions,
    });

    return resolvedId === calendar.id;
}

/**
 * 3系統のシード純関数（祝日・年末年始・特別ダイヤ）から calendar_dates 相当の
 * 行集合を組み立てる（実DBには一切書き込まない）。
 */
export function buildAllCalendarDateRows(params: {
    calendars: CalendarValidityRow[];
    holidayDates: string[];
    from: string;
    to: string;
}): CalendarDateSeedRow[] {
    const { calendars, holidayDates, from, to } = params;

    return [
        ...buildHolidayCalendarDateRows({ holidayDates, calendars, from, to }),
        ...buildNewYearCalendarDateRows({
            newYearMonthDays: newYearDays,
            calendars,
            from,
            to,
        }),
        ...buildSpecialCalendarDateRows({
            specialDates: specialCalendarDays,
            calendars,
        }),
    ];
}

export interface CalendarJudgmentMismatch {
    date: string;
    calendarId: string;
    legacyResult: boolean;
    newResult: boolean;
}

/**
 * [from, to] の全日 × 全カレンダーについて、旧経路（3ハードコード判定）と
 * 新経路（calendar_dates 由来）の運行日判定を突き合わせ、不一致を列挙する。
 * 空配列 = 完全一致（撤去ゲート green）。
 */
export function verifyCalendarJudgmentEquivalence(params: {
    from: string;
    to: string;
    calendars: CalendarValidityRow[];
    holidayDates: string[];
}): CalendarJudgmentMismatch[] {
    const { from, to, calendars, holidayDates } = params;

    const calendarDateRows = buildAllCalendarDateRows({
        calendars,
        holidayDates,
        from,
        to,
    });

    const mismatches: CalendarJudgmentMismatch[] = [];

    let cursor = dayjs(from, DATE_FORMAT);
    const end = dayjs(to, DATE_FORMAT);

    while (cursor.isBefore(end) || cursor.isSame(end, 'day')) {
        const date = cursor.format(DATE_FORMAT);

        for (const calendar of calendars) {
            const legacyResult = legacyJudgment({ date, calendar });
            const newResult = newJudgment({ date, calendar, calendarDateRows });

            if (legacyResult !== newResult) {
                mismatches.push({
                    date,
                    calendarId: calendar.id,
                    legacyResult,
                    newResult,
                });
            }
        }

        cursor = cursor.add(1, 'day');
    }

    return mismatches;
}
