import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone.js';
import utc from 'dayjs/plugin/utc.js';
import { UseCaseError } from '../../../core/classes/custom-error.js';
import { parseSightingTime } from './sighting-time.js';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault('Asia/Tokyo');

const base = {
    agencyId: 'agency-1',
    formationOrVehicleNumber: '8701',
    operationNumber: '41',
};

const reasonOf = (sightingTime: string) => {
    try {
        parseSightingTime({ ...base, sightingTime });
    } catch (error) {
        if (error instanceof UseCaseError) {
            return error.context.reason;
        }
        throw error;
    }
    return null;
};

describe('parseSightingTime', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-10-23T01:00:00.000Z'));
    });
    afterEach(() => {
        vi.useRealTimers();
    });

    describe('形式', () => {
        it.each([
            ['2026-10-23T10:00:00', 'オフセットが無い'],
            ['2026-10-23', '日付だけ'],
        ])('%s（%s）は offset_missing', (value) => {
            expect(reasonOf(value)).toBe('offset_missing');
        });

        it('オフセットの形でも日時として読めなければ invalid_datetime（コロン無しの時刻）', () => {
            expect(reasonOf('2026-10-23T0900+0900')).toBe('invalid_datetime');
        });

        it('オフセットがあっても日時として読めなければ invalid_datetime', () => {
            expect(reasonOf('2026-13-45T10:00:00Z')).toBe('invalid_datetime');
        });

        it.each(['2026-10-23T00:00:00Z', '2026-10-23T09:00:00+09:00'])(
            '%s は受け付ける',
            (value) => {
                expect(reasonOf(value)).toBeNull();
            },
        );

        it('エラーの文脈に入力をそのまま入れる', () => {
            expect.assertions(1);
            try {
                parseSightingTime({
                    ...base,
                    sightingTime: '2026-10-23T10:00:00',
                });
            } catch (error) {
                expect((error as UseCaseError).context).toEqual({
                    ...base,
                    sightingTime: '2026-10-23T10:00:00',
                    reason: 'offset_missing',
                });
            }
        });
    });

    describe('未来', () => {
        it('現在から 60 秒ちょうど先までは受け付け、現在時刻にそろえる', () => {
            const result = parseSightingTime({
                ...base,
                sightingTime: '2026-10-23T01:01:00.000Z',
            });
            expect(result.sightingTimeInstance.toISOString()).toBe(
                '2026-10-23T01:00:00.000Z',
            );
        });

        it('60 秒を 1 ミリ秒でも超えると future_datetime', () => {
            expect(reasonOf('2026-10-23T01:01:00.001Z')).toBe(
                'future_datetime',
            );
        });

        it('過去の時刻はそのまま保つ', () => {
            const result = parseSightingTime({
                ...base,
                sightingTime: '2026-10-23T00:30:00.000Z',
            });
            expect(result.sightingTimeInstance.toISOString()).toBe(
                '2026-10-23T00:30:00.000Z',
            );
        });
    });

    describe('鉄道日の境（JST の 4 時）', () => {
        it('JST 3:59 は前の日', () => {
            const result = parseSightingTime({
                ...base,
                sightingTime: '2026-10-22T18:59:00.000Z',
            });
            expect(result.date).toBe('2026-10-22');
        });

        it('JST 4:00 から次の日', () => {
            vi.setSystemTime(new Date('2026-10-23T20:00:00.000Z'));
            const result = parseSightingTime({
                ...base,
                sightingTime: '2026-10-22T19:00:00.000Z',
            });
            expect(result.date).toBe('2026-10-23');
        });

        it('JST の時刻を返す', () => {
            const result = parseSightingTime({
                ...base,
                sightingTime: '2026-10-23T00:00:00.000Z',
            });
            expect(result.sightingTimeInJst.format()).toBe(
                '2026-10-23T09:00:00+09:00',
            );
        });
    });
});
