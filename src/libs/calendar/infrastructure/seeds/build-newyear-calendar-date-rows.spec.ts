import {
    CALENDAR_DATE_EXCEPTION_TYPE_ADDED,
    CALENDAR_DATE_EXCEPTION_TYPE_REMOVED,
} from '../models/calendar-date.model';
import { CalendarValidityRow } from './build-holiday-calendar-date-rows';
import { buildNewYearCalendarDateRows } from './build-newyear-calendar-date-rows';

const NEW_YEAR_MONTH_DAYS = ['12-30', '12-31', '01-01', '01-02', '01-03'];

function makeCalendar(
    overrides: Partial<CalendarValidityRow> & { id: string },
): CalendarValidityRow {
    return {
        startDate: '2024-01-01',
        endDate: null,
        sunday: false,
        monday: false,
        tuesday: false,
        wednesday: false,
        thursday: false,
        friday: false,
        saturday: false,
        ...overrides,
    };
}

describe('buildNewYearCalendarDateRows', () => {
    it('複数年にまたがる有効期間は年ごとに全 MM-DD を展開する', () => {
        const rows = buildNewYearCalendarDateRows({
            newYearMonthDays: NEW_YEAR_MONTH_DAYS,
            calendars: [
                makeCalendar({
                    id: 'holiday-calendar',
                    sunday: true,
                    startDate: '2023-01-01',
                    endDate: '2025-12-31',
                }),
            ],
        });

        expect(rows).toHaveLength(3 * NEW_YEAR_MONTH_DAYS.length);
        expect(rows.every((r) => r.calendarId === 'holiday-calendar')).toBe(
            true,
        );
        expect(rows.every((r) => r.memo === '年末年始')).toBe(true);
        expect(rows.every((r) => r.exceptionType === CALENDAR_DATE_EXCEPTION_TYPE_ADDED)).toBe(
            true,
        );
        expect(rows.map((r) => r.date)).toEqual(
            expect.arrayContaining([
                '2023-01-01',
                '2023-12-31',
                '2024-01-01',
                '2024-12-31',
                '2025-01-01',
                '2025-12-31',
            ]),
        );
    });

    it('有効期間と年末年始 MM-DD が交差しないカレンダーは行が生成されない', () => {
        const rows = buildNewYearCalendarDateRows({
            newYearMonthDays: NEW_YEAR_MONTH_DAYS,
            calendars: [
                makeCalendar({
                    id: 'midyear-only',
                    monday: true,
                    startDate: '2024-04-01',
                    endDate: '2024-11-30',
                }),
            ],
        });

        expect(rows).toEqual([]);
    });

    it('--from/--to 相当の期間指定で範囲外の日付をクリップする', () => {
        const rows = buildNewYearCalendarDateRows({
            newYearMonthDays: NEW_YEAR_MONTH_DAYS,
            calendars: [
                makeCalendar({
                    id: 'unbounded-calendar',
                    sunday: true,
                    startDate: '2020-01-01',
                    endDate: null,
                }),
            ],
            from: '2024-06-01',
            to: '2024-12-30',
        });

        expect(rows).toEqual([
            {
                calendarId: 'unbounded-calendar',
                date: '2024-12-30',
                exceptionType: CALENDAR_DATE_EXCEPTION_TYPE_ADDED,
                memo: '年末年始',
            },
        ]);
    });

    it('年またぎの有効期間でも 12-31/01-01 が正しい YYYY-MM-DD になる', () => {
        const rows = buildNewYearCalendarDateRows({
            newYearMonthDays: NEW_YEAR_MONTH_DAYS,
            calendars: [
                makeCalendar({
                    id: 'crossing-calendar',
                    sunday: true,
                    startDate: '2023-06-01',
                    endDate: '2024-03-31',
                }),
            ],
        });

        expect(rows.map((r) => r.date)).toEqual([
            '2023-12-30',
            '2023-12-31',
            '2024-01-01',
            '2024-01-02',
            '2024-01-03',
        ]);
    });

    it('休日ダイヤ系（sunday=true）は type1、平日ダイヤ系（monday..friday）は type2、どちらでもないカレンダーは対象外', () => {
        const rows = buildNewYearCalendarDateRows({
            newYearMonthDays: ['01-01'],
            calendars: [
                makeCalendar({ id: 'holiday-calendar', sunday: true }),
                makeCalendar({ id: 'weekday-calendar', monday: true }),
                makeCalendar({ id: 'saturday-only', saturday: true }),
            ],
            from: '2024-01-01',
            to: '2024-01-01',
        });

        expect(rows).toEqual([
            {
                calendarId: 'holiday-calendar',
                date: '2024-01-01',
                exceptionType: CALENDAR_DATE_EXCEPTION_TYPE_ADDED,
                memo: '年末年始',
            },
            {
                calendarId: 'weekday-calendar',
                date: '2024-01-01',
                exceptionType: CALENDAR_DATE_EXCEPTION_TYPE_REMOVED,
                memo: '年末年始',
            },
        ]);
    });

    it('endDate が無期限のカレンダーは、他カレンダーの過去の有限 endDate に引っ張られず現在年+1まで年末年始行を生成する（回帰検体）', () => {
        // 実DBの再現: 2022-03-12 に切り替わった現行カレンダー（endDate=null）と、
        // それ以前の旧カレンダー（endDate=2022-03-11 で有限）が共存する構成。
        // 旧カレンダーの endDate に引っ張られて現行カレンダーの未来年が
        // 欠落しないことを検証する（--to 未指定＝本番シードのデフォルト実行を再現）。
        const rows = buildNewYearCalendarDateRows({
            newYearMonthDays: NEW_YEAR_MONTH_DAYS,
            calendars: [
                makeCalendar({
                    id: 'legacy-holiday-calendar',
                    sunday: true,
                    startDate: '2013-01-01',
                    endDate: '2022-03-11',
                }),
                makeCalendar({
                    id: 'current-holiday-calendar',
                    sunday: true,
                    startDate: '2022-03-12',
                    endDate: null,
                }),
            ],
            now: new Date('2026-01-15'),
        });

        const currentDates = rows
            .filter((r) => r.calendarId === 'current-holiday-calendar')
            .map((r) => r.date);

        // 現在年+1（2027）の年末年始まで生成されていること
        expect(currentDates).toEqual(
            expect.arrayContaining(['2026-12-31', '2027-01-01']),
        );
        // 他カレンダーの有限 endDate（2022年）で頭打ちになっていないこと
        expect(currentDates.some((d) => d >= '2023-01-01')).toBe(true);
    });

    it('startDate/endDate ともに無期限で from/to も他カレンダーの境界も無い場合はエラーを投げる（無限展開防止）', () => {
        expect(() =>
            buildNewYearCalendarDateRows({
                newYearMonthDays: NEW_YEAR_MONTH_DAYS,
                calendars: [
                    makeCalendar({
                        id: 'fully-unbounded',
                        sunday: true,
                        startDate: null,
                        endDate: null,
                    }),
                ],
            }),
        ).toThrow();
    });
});
