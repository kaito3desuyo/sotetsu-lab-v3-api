import {
    CALENDAR_DATE_EXCEPTION_TYPE_ADDED,
    CALENDAR_DATE_EXCEPTION_TYPE_REMOVED,
} from '../models/calendar-date.model';
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

    it('実際の曜日フラグが true な通常カレンダー（例: 土休日ダイヤの土曜）は type2（除外）になる', () => {
        // 2021-10-23 は土曜日。土休日ダイヤ（sunday/saturday=true）は曜日規則だけなら
        // 運行してしまうため、特別ダイヤの日は明示的に除外する必要がある
        // （旧 buildDayOfWeekMatcher は特別日に全カレンダー一律で「全曜日フラグ false」
        //   判定を適用するため、通常カレンダーは実際の曜日に関わらず運行しない）。
        const rows = buildSpecialCalendarDateRows({
            specialDates: ['2021-10-23'],
            calendars: [
                makeCalendar({
                    id: 'weekend-holiday-calendar',
                    sunday: true,
                    saturday: true,
                }),
            ],
        });

        expect(rows).toEqual([
            {
                calendarId: 'weekend-holiday-calendar',
                date: '2021-10-23',
                exceptionType: CALENDAR_DATE_EXCEPTION_TYPE_REMOVED,
                memo: '特別ダイヤ（specialCalendarDays 移行・通常カレンダーの運休）',
            },
        ]);
    });

    it('実際の曜日フラグが false な通常カレンダー（例: 平日ダイヤの土曜日）は対象外のまま', () => {
        // 2021-10-23 は土曜日。平日ダイヤ（monday=true, saturday=false）は
        // 曜日規則だけでも元々運行しないため、除外行は不要。
        const rows = buildSpecialCalendarDateRows({
            specialDates: ['2021-10-23'],
            calendars: [makeCalendar({ id: 'weekday-calendar', monday: true })],
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
