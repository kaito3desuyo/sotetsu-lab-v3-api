import {
    CALENDAR_DATE_EXCEPTION_TYPE_ADDED,
    CALENDAR_DATE_EXCEPTION_TYPE_REMOVED,
    CalendarDateExceptionType,
} from '../models/calendar-date.model';
import {
    CalendarDateSeedRow,
    CalendarValidityRow,
    isWithinCalendarValidity,
} from './build-holiday-calendar-date-rows';

/**
 * 年末年始 MM-DD 一覧 × カレンダー一覧から、calendar_dates へ upsert すべき行を組み立てる純関数。
 *
 * 移行元は `core/utils/day-of-week.ts` の `newYearDays`（毎年固定の年末年始 MM-DD 配列）。
 * 判定ロジックは build-holiday-calendar-date-rows と同一:
 * - 休日ダイヤ系（sunday=true）→ type1（追加・運行させる）
 * - 平日ダイヤ系（monday〜friday のいずれか true）→ type2（除外・運休させる）
 * - どちらにも該当しない（土曜専用カレンダー等）カレンダーは対象外
 *
 * newYearDays は年を持たない MM-DD のため、祝日シードのように日付一覧をそのまま
 * フィルタすることができない。各カレンダーの有効期間（startDate〜endDate）と
 * from/to の交差から対象年範囲をまず決定し、年ごとに MM-DD を展開して
 * YYYY-MM-DD の日付を組み立てる。
 *
 * endDate が null（無期限）のカレンダーは、from/to や他カレンダーの最大 endDate
 * から上限年を求める。startDate が null のカレンダーも同様に from や他カレンダーの
 * 情報から下限年を求める。どちらの上限/下限も一切求まらない場合は、無限展開を
 * 避けるためエラーとする。
 */
export function buildNewYearCalendarDateRows(params: {
    newYearMonthDays: string[];
    calendars: CalendarValidityRow[];
    from?: string;
    to?: string;
}): CalendarDateSeedRow[] {
    const { newYearMonthDays, calendars, from, to } = params;

    const rows: CalendarDateSeedRow[] = [];

    for (const calendar of calendars) {
        const exceptionType = resolveExceptionType(calendar);
        if (exceptionType === null) continue;

        const range = resolveCalendarYearRange(calendar, calendars, from, to);
        if (!range) continue;

        for (let year = range.startYear; year <= range.endYear; year++) {
            for (const monthDay of newYearMonthDays) {
                const date = `${year}-${monthDay}`;

                if (from && date < from) continue;
                if (to && date > to) continue;
                if (!isWithinCalendarValidity(calendar, date)) continue;

                rows.push({
                    calendarId: calendar.id,
                    date,
                    exceptionType,
                    memo: '年末年始',
                });
            }
        }
    }

    return rows;
}

function resolveExceptionType(
    calendar: Pick<
        CalendarValidityRow,
        'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday'
    >,
): CalendarDateExceptionType | null {
    if (calendar.sunday) return CALENDAR_DATE_EXCEPTION_TYPE_ADDED;
    if (
        calendar.monday ||
        calendar.tuesday ||
        calendar.wednesday ||
        calendar.thursday ||
        calendar.friday
    ) {
        return CALENDAR_DATE_EXCEPTION_TYPE_REMOVED;
    }
    return null;
}

function resolveCalendarYearRange(
    calendar: Pick<CalendarValidityRow, 'startDate' | 'endDate'>,
    calendars: CalendarValidityRow[],
    from: string | undefined,
    to: string | undefined,
): { startYear: number; endYear: number } | null {
    const effectiveStart =
        laterDate(calendar.startDate, from ?? null) ?? minStartDate(calendars);
    const effectiveEnd =
        calendar.endDate !== null
            ? earlierDate(calendar.endDate, to ?? null)
            : (to ?? maxEndDate(calendars));

    if (!effectiveStart || !effectiveEnd) {
        throw new Error(
            '年末年始シードの展開に上限/下限が決定できないカレンダーがあります' +
                '（startDate が未設定かつ --from 未指定、または endDate が無期限かつ --to 未指定で、' +
                '他カレンダーからも境界を求められません）。--from/--to を指定してください。',
        );
    }

    const startYear = Number(effectiveStart.slice(0, 4));
    const endYear = Number(effectiveEnd.slice(0, 4));
    if (startYear > endYear) return null;

    return { startYear, endYear };
}

function laterDate(a: string | null, b: string | null): string | null {
    if (!a) return b;
    if (!b) return a;
    return a > b ? a : b;
}

function earlierDate(a: string, b: string | null): string {
    if (!b) return a;
    return a < b ? a : b;
}

function minStartDate(calendars: CalendarValidityRow[]): string | null {
    return calendars.reduce<string | null>((min, c) => {
        if (!c.startDate) return min;
        if (!min || c.startDate < min) return c.startDate;
        return min;
    }, null);
}

function maxEndDate(calendars: CalendarValidityRow[]): string | null {
    return calendars.reduce<string | null>((max, c) => {
        if (!c.endDate) return max;
        if (!max || c.endDate > max) return c.endDate;
        return max;
    }, null);
}
