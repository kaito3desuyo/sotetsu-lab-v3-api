import { resolveCalendarIdBySpecificDate } from './resolve-calendar-id-by-specific-date';

describe('resolveCalendarIdBySpecificDate', () => {
    it('例外が0件の場合、曜日規則にマッチしたカレンダーを返す（従来判定と完全一致・リグレッションなし）', () => {
        const result = resolveCalendarIdBySpecificDate({
            candidates: [
                { id: 'weekday-calendar', dayOfWeekMatches: true },
                { id: 'holiday-calendar', dayOfWeekMatches: false },
            ],
            exceptions: [],
        });

        expect(result).toBe('weekday-calendar');
    });

    it('例外が0件かつどのカレンダーも曜日規則にマッチしない場合は null を返す（従来判定と完全一致）', () => {
        const result = resolveCalendarIdBySpecificDate({
            candidates: [
                { id: 'weekday-calendar', dayOfWeekMatches: false },
                { id: 'holiday-calendar', dayOfWeekMatches: false },
            ],
            exceptions: [],
        });

        expect(result).toBeNull();
    });

    it('平日ダイヤの祝日に type2（運休）+ 休日ダイヤに type1（追加）を登録すると、休日ダイヤ判定になる', () => {
        // 平日ダイヤは曜日規則ではマッチするが、当日の type2 除外により無効化される
        // 休日ダイヤは曜日規則ではマッチしないが、当日の type1 追加により有効化される
        const result = resolveCalendarIdBySpecificDate({
            candidates: [
                { id: 'weekday-calendar', dayOfWeekMatches: true },
                { id: 'holiday-calendar', dayOfWeekMatches: false },
            ],
            exceptions: [
                { calendarId: 'weekday-calendar', exceptionType: 2 },
                { calendarId: 'holiday-calendar', exceptionType: 1 },
            ],
        });

        expect(result).toBe('holiday-calendar');
    });

    it('土曜に type1（臨時運行）を登録すると、曜日規則ではマッチしないカレンダーも判定に含まれる', () => {
        const result = resolveCalendarIdBySpecificDate({
            candidates: [
                { id: 'special-event-calendar', dayOfWeekMatches: false },
            ],
            exceptions: [
                { calendarId: 'special-event-calendar', exceptionType: 1 },
            ],
        });

        expect(result).toBe('special-event-calendar');
    });

    it('曜日規則にマッチするカレンダーが type2 のみで除外され、他に該当がなければ null を返す', () => {
        const result = resolveCalendarIdBySpecificDate({
            candidates: [{ id: 'weekday-calendar', dayOfWeekMatches: true }],
            exceptions: [{ calendarId: 'weekday-calendar', exceptionType: 2 }],
        });

        expect(result).toBeNull();
    });

    it('同一カレンダーに type1 と type2 が同時に存在することはない前提だが、type1 が優先されても曜日規則側が誤って勝たない', () => {
        const result = resolveCalendarIdBySpecificDate({
            candidates: [{ id: 'calendar-a', dayOfWeekMatches: false }],
            exceptions: [
                { calendarId: 'calendar-a', exceptionType: 1 },
                { calendarId: 'calendar-b', exceptionType: 2 },
            ],
        });

        expect(result).toBe('calendar-a');
    });
});
