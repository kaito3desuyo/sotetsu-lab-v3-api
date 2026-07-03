import {
    CALENDAR_DATE_EXCEPTION_TYPE_ADDED,
    CALENDAR_DATE_EXCEPTION_TYPE_REMOVED,
} from '../models/calendar-date.model';
import {
    buildHolidayCalendarDateRows,
    CalendarValidityRow,
} from './build-holiday-calendar-date-rows';

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

describe('buildHolidayCalendarDateRows', () => {
    it('休日ダイヤ系（sunday=true）は type1（追加）になる', () => {
        const rows = buildHolidayCalendarDateRows({
            holidayDates: ['2024-01-01'],
            calendars: [
                makeCalendar({ id: 'holiday-calendar', sunday: true }),
            ],
        });

        expect(rows).toEqual([
            {
                calendarId: 'holiday-calendar',
                date: '2024-01-01',
                exceptionType: CALENDAR_DATE_EXCEPTION_TYPE_ADDED,
                memo: '祝日',
            },
        ]);
    });

    it('平日ダイヤ系（monday..friday のいずれか true）は type2（除外）になる', () => {
        const rows = buildHolidayCalendarDateRows({
            holidayDates: ['2024-01-01'],
            calendars: [
                makeCalendar({ id: 'weekday-calendar', monday: true }),
            ],
        });

        expect(rows).toEqual([
            {
                calendarId: 'weekday-calendar',
                date: '2024-01-01',
                exceptionType: CALENDAR_DATE_EXCEPTION_TYPE_REMOVED,
                memo: '祝日',
            },
        ]);
    });

    it('sunday も weekday も false のカレンダー（土曜専用等）は対象外', () => {
        const rows = buildHolidayCalendarDateRows({
            holidayDates: ['2024-01-01'],
            calendars: [
                makeCalendar({ id: 'saturday-only', saturday: true }),
            ],
        });

        expect(rows).toEqual([]);
    });

    it('カレンダーの有効期間（startDate〜endDate）外の祝日は除外する', () => {
        const rows = buildHolidayCalendarDateRows({
            holidayDates: ['2025-01-01'],
            calendars: [
                makeCalendar({
                    id: 'expired-calendar',
                    sunday: true,
                    startDate: '2020-01-01',
                    endDate: '2024-12-31',
                }),
            ],
        });

        expect(rows).toEqual([]);
    });

    it('endDate が null のカレンダーは無期限として扱う', () => {
        const rows = buildHolidayCalendarDateRows({
            holidayDates: ['2099-01-01'],
            calendars: [
                makeCalendar({
                    id: 'unbounded-calendar',
                    sunday: true,
                    startDate: '2020-01-01',
                    endDate: null,
                }),
            ],
        });

        expect(rows).toHaveLength(1);
    });

    it('--from/--to 相当の期間指定で範囲外の祝日を除外する', () => {
        const rows = buildHolidayCalendarDateRows({
            holidayDates: ['2024-01-01', '2024-06-01', '2024-12-31'],
            calendars: [makeCalendar({ id: 'holiday-calendar', sunday: true })],
            from: '2024-02-01',
            to: '2024-11-30',
        });

        expect(rows).toEqual([
            {
                calendarId: 'holiday-calendar',
                date: '2024-06-01',
                exceptionType: CALENDAR_DATE_EXCEPTION_TYPE_ADDED,
                memo: '祝日',
            },
        ]);
    });

    it('冪等キー（calendarId, date）が同一祝日・同一カレンダーで重複しない', () => {
        const rows = buildHolidayCalendarDateRows({
            holidayDates: ['2024-01-01'],
            calendars: [makeCalendar({ id: 'holiday-calendar', sunday: true })],
        });
        const rowsAgain = buildHolidayCalendarDateRows({
            holidayDates: ['2024-01-01'],
            calendars: [makeCalendar({ id: 'holiday-calendar', sunday: true })],
        });

        expect(rows).toEqual(rowsAgain);
        expect(rows).toHaveLength(1);
    });
});
