import dayjs from 'dayjs';
import { isHoliday } from 'src/core/utils/day-of-week';
import { CalendarValidityRow } from '../seeds/build-holiday-calendar-date-rows';
import {
    CalendarJudgmentMismatch,
    verifyCalendarJudgmentEquivalence,
} from './verify-calendar-judgment-equivalence';

/**
 * 実運用のカレンダー構成（db/backup/1569130509694-SeedCalendar.ts 等で実績のある
 * 組み合わせ）を代表するカレンダー3種を、検証対象の全期間をカバーする無期限有効
 * カレンダーとして用意する。相鉄の実データでは「土曜専用」カレンダーは存在せず、
 * 土曜日は「土休日ダイヤ」（sunday=true かつ saturday=true）に統合されている。
 */
const CALENDARS: CalendarValidityRow[] = [
    {
        id: 'weekend-holiday-calendar', // 土休日ダイヤ相当（日曜・土曜・祝日）
        startDate: '2013-01-01',
        endDate: null,
        sunday: true,
        monday: false,
        tuesday: false,
        wednesday: false,
        thursday: false,
        friday: false,
        saturday: true,
    },
    {
        id: 'weekday-calendar', // 平日ダイヤ相当
        startDate: '2013-01-01',
        endDate: null,
        sunday: false,
        monday: true,
        tuesday: true,
        wednesday: true,
        thursday: true,
        friday: true,
        saturday: false,
    },
    {
        id: 'special-calendar', // 特別ダイヤ相当（全曜日フラグ false）
        startDate: '2013-01-01',
        endDate: null,
        sunday: false,
        monday: false,
        tuesday: false,
        wednesday: false,
        thursday: false,
        friday: false,
        saturday: false,
    },
];

/**
 * day-of-week.ts の holidays 配列は export されていないため、実CSVを使わずに
 * 既存の exported 判定関数 isHoliday を用いて [from, to] 内の祝日一覧を
 * 再構成する（＝ハードコード配列そのものを別実装せず、既存の判定を通して取得する）。
 * これにより「内閣府CSV との差分検証」はスコープ外のまま、holidays 配列との
 * 等価性検証は成立する。
 */
function collectHolidayDatesInRange(from: string, to: string): string[] {
    const dates: string[] = [];
    let cursor = dayjs(from, 'YYYY-MM-DD');
    const end = dayjs(to, 'YYYY-MM-DD');

    while (cursor.isBefore(end) || cursor.isSame(end, 'day')) {
        const date = cursor.format('YYYY-MM-DD');
        if (isHoliday(date)) {
            dates.push(date);
        }
        cursor = cursor.add(1, 'day');
    }

    return dates;
}

function formatMismatches(mismatches: CalendarJudgmentMismatch[]): string {
    return mismatches
        .map(
            (m) =>
                `${m.date} / ${m.calendarId}: legacy=${m.legacyResult} new=${m.newResult}`,
        )
        .join('\n');
}

function expectNoMismatches(from: string, to: string): void {
    const mismatches = verifyCalendarJudgmentEquivalence({
        from,
        to,
        calendars: CALENDARS,
        holidayDates: collectHolidayDatesInRange(from, to),
    });

    expect(formatMismatches(mismatches)).toBe('');
    expect(mismatches).toEqual([]);
}

describe('verifyCalendarJudgmentEquivalence', () => {
    it('2019年の要注意日（即位礼正殿の儀・国民の休日等）を含む期間で完全一致する', () => {
        // 2019-04-30/2019-05-02 国民の休日、2019-05-01 即位、2019-10-22 即位礼正殿の儀
        expectNoMismatches('2019-04-25', '2019-05-10');
        expectNoMismatches('2019-10-15', '2019-10-25');
    });

    it('2020-2021年の五輪移動日（海の日・スポーツの日・山の日の移動）を含む期間で完全一致する', () => {
        expectNoMismatches('2020-07-15', '2020-08-15');
        expectNoMismatches('2021-07-15', '2021-08-15');
    });

    it('年末年始（年またぎ）で完全一致する', () => {
        expectNoMismatches('2020-12-25', '2021-01-05');
    });

    it('通常の平日・土日（対照）で完全一致する', () => {
        expectNoMismatches('2022-03-01', '2022-03-31');
    });

    it('specialCalendarDays（JR渋谷駅工事臨時ダイヤ）を含む期間で完全一致する', () => {
        expectNoMismatches('2021-10-18', '2021-10-28');
        expectNoMismatches('2023-01-03', '2023-01-12');
        expectNoMismatches('2023-11-14', '2023-11-23');
    });

    it('過去年（2014-2015）の祝日で旧新一致する', () => {
        expectNoMismatches('2014-01-01', '2015-12-31');
    });

    it('全期間（2014-2026）を通して完全一致する（撤去ゲート・総合）', () => {
        expectNoMismatches('2014-01-01', '2026-12-31');
    });
});
