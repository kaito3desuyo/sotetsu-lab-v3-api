import dayjs from 'dayjs';
import { getDayOfWeek, newYearDays, specialCalendarDays } from 'src/core/utils/day-of-week';
import { CalendarDateExceptionType } from '../models/calendar-date.model';
import { CalendarQuery } from '../queries/calendar.query';
import { resolveCalendarIdBySpecificDate } from '../queries/resolve-calendar-id-by-specific-date';
import {
    buildHolidayCalendarDateRows,
    CalendarDateSeedRow,
    CalendarValidityRow,
    isWithinCalendarValidity,
} from '../seeds/build-holiday-calendar-date-rows';
import { buildNewYearCalendarDateRows } from '../seeds/build-newyear-calendar-date-rows';
import { buildSpecialCalendarDateRows } from '../seeds/build-special-calendar-date-rows';

const DATE_FORMAT = 'YYYY-MM-DD';

type LegacyDayOfWeekMatcher = (calendar: CalendarValidityRow) => boolean;
type BuildLegacyDayOfWeekMatcherFn = (
    dateString: string,
    format: string,
) => LegacyDayOfWeekMatcher;

/**
 * CalendarQuery.buildDayOfWeekMatcher（private）をプロトタイプ経由で直接参照する。
 *
 * 当該メソッドは `this` を一切参照しない純粋関数（isSpecialCalendarAvailable /
 * isHoliday・isNewYear / getDayOfWeek の3分岐のみで構成される）ため、ロジックを
 * 複製せず本番コードをそのまま呼び出すことで検証の信頼性を担保する
 * （＝旧経路の判定はこの1関数への参照のみで、独自の再実装は行っていない）。
 *
 * 引数の calendar は sunday〜saturday の真偽値プロパティにしかアクセスされないため、
 * CalendarModel の代わりに CalendarValidityRow を渡しても本番と同一の結果になる。
 */
const legacyBuildDayOfWeekMatcher = (
    CalendarQuery.prototype as unknown as {
        buildDayOfWeekMatcher: BuildLegacyDayOfWeekMatcherFn;
    }
).buildDayOfWeekMatcher;

/**
 * 旧経路（撤去予定の3ハードコード判定）による「その日そのカレンダーが運行するか」。
 * calendar_dates は一切参照しない（現行 CalendarQuery が calendar_dates 移行前に
 * 行っていた判定と同一：有効期間チェック + buildDayOfWeekMatcher）。
 */
export function legacyJudgment(params: {
    date: string;
    calendar: CalendarValidityRow;
}): boolean {
    const { date, calendar } = params;

    if (!isWithinCalendarValidity(calendar, date)) {
        return false;
    }

    const matcher = legacyBuildDayOfWeekMatcher(date, DATE_FORMAT);
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
