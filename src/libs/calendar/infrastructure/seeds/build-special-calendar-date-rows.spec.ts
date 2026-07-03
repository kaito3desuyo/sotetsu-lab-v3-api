import { CALENDAR_DATE_EXCEPTION_TYPE_ADDED } from '../models/calendar-date.model';
import { CalendarValidityRow } from './build-holiday-calendar-date-rows';
import { buildSpecialCalendarDateRows } from './build-special-calendar-date-rows';

function makeCalendar(
    overrides: Partial<CalendarValidityRow> & { id: string },
): CalendarValidityRow {
    return {
        startDate: '2021-01-01',
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

describe('buildSpecialCalendarDateRows', () => {
    it('全曜日フラグ false のカレンダーのみ type1（追加）で移行する', () => {
        const rows = buildSpecialCalendarDateRows({
            specialDates: ['2021-10-23'],
            calendars: [
                makeCalendar({ id: 'special-calendar' }),
                makeCalendar({ id: 'normal-holiday-calendar', sunday: true }),
            ],
        });

        expect(rows).toEqual([
            {
                calendarId: 'special-calendar',
                date: '2021-10-23',
                exceptionType: CALENDAR_DATE_EXCEPTION_TYPE_ADDED,
                memo: '特別ダイヤ（specialCalendarDays 移行）',
            },
        ]);
    });

    it('通常カレンダー（いずれかの曜日フラグ true）は対象外', () => {
        const rows = buildSpecialCalendarDateRows({
            specialDates: ['2021-10-23'],
            calendars: [makeCalendar({ id: 'weekday-calendar', monday: true })],
        });

        expect(rows).toEqual([]);
    });

    it('カレンダーの有効期間外の特別日は除外する', () => {
        const rows = buildSpecialCalendarDateRows({
            specialDates: ['2021-10-23'],
            calendars: [
                makeCalendar({
                    id: 'special-calendar',
                    startDate: '2023-01-01',
                    endDate: '2023-12-31',
                }),
            ],
        });

        expect(rows).toEqual([]);
    });

    it('冪等キー（calendarId, date）が同一入力で重複しない', () => {
        const input = {
            specialDates: ['2021-10-23', '2021-10-24'],
            calendars: [makeCalendar({ id: 'special-calendar' })],
        };

        const rows = buildSpecialCalendarDateRows(input);
        const rowsAgain = buildSpecialCalendarDateRows(input);

        expect(rows).toEqual(rowsAgain);
        expect(rows).toHaveLength(2);
    });
});
