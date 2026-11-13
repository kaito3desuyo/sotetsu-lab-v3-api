import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
    IsDateOnly,
    IsInstant,
    IsParsableDate,
    IsPeriodWithin,
} from './date-validators.js';
import { PERIOD_MAX_DAYS } from './limits.js';

class DateSample {
    @IsDateOnly()
    date?: string;
}
class InstantSample {
    @IsInstant()
    at?: string;
}
class ParsableSample {
    @IsParsableDate()
    at?: string;
}
class PeriodSample {
    @IsDateOnly()
    start?: string;
    @IsDateOnly()
    @IsPeriodWithin('start', PERIOD_MAX_DAYS)
    end?: string;
}

const errors = async <T extends object>(
    cls: new () => T,
    plain: Record<string, unknown>,
) => validate(plainToInstance(cls, plain));

describe('日付・期間・時刻の検証', () => {
    it.each(['2026-11-14', '2026-02-28', '2028-02-29'])(
        'IsDateOnly は %s を通す',
        async (date) => {
            expect(await errors(DateSample, { date })).toHaveLength(0);
        },
    );
    it.each([
        '2026-02-30',
        '20261114',
        '2026-11-14T00:00:00+09:00',
        'garbage',
        '',
    ])('IsDateOnly は %s を通さない', async (date) => {
        expect(await errors(DateSample, { date })).toHaveLength(1);
    });
    it('IsDateOnly は文字列でない値を通さない', async () => {
        expect(await errors(DateSample, { date: 20261114 })).toHaveLength(1);
    });

    it.each(['2026-11-14T12:00:00+09:00', '2026-11-13T22:02:06.178Z'])(
        'IsInstant は %s を通す',
        async (at) => {
            expect(await errors(InstantSample, { at })).toHaveLength(0);
        },
    );
    it.each(['2026-11-14T12:00:00', '2026-11-14', 'garbage', '2026-W01'])(
        'IsInstant は %s を通さない',
        async (at) => {
            expect(await errors(InstantSample, { at })).toHaveLength(1);
        },
    );

    it('IsParsableDate は週表記を通さない', async () => {
        expect(await errors(ParsableSample, { at: '2026-W01' })).toHaveLength(
            1,
        );
        expect(
            await errors(ParsableSample, { at: '2026-11-14T00:00:00Z' }),
        ).toHaveLength(0);
    });

    it('IsPeriodWithin(31) は 11/01〜12/01 を通し 11/01〜12/02 と 11/02〜11/01 を通さない', async () => {
        expect(
            await errors(PeriodSample, {
                start: '2026-11-01',
                end: '2026-12-01',
            }),
        ).toHaveLength(0);
        expect(
            await errors(PeriodSample, {
                start: '2026-11-01',
                end: '2026-12-02',
            }),
        ).toHaveLength(1);
        expect(
            await errors(PeriodSample, {
                start: '2026-11-02',
                end: '2026-11-01',
            }),
        ).toHaveLength(1);
    });
    it('IsPeriodWithin は start == end を通す', async () => {
        expect(
            await errors(PeriodSample, {
                start: '2026-11-01',
                end: '2026-11-01',
            }),
        ).toHaveLength(0);
    });
    it('IsPeriodWithin は start が不正なら何も言わない', async () => {
        const result = await errors(PeriodSample, {
            start: 'garbage',
            end: '2026-11-01',
        });
        expect(result).toHaveLength(1);
        expect(result[0].property).toBe('start');
    });
});
