import { readFileSync } from 'fs';
import { join } from 'path';
import {
    decodeShiftJisCsv,
    parseSyukujitsuCsv,
    parseSyukujitsuCsvBuffer,
} from './parse-syukujitsu-csv';

describe('parseSyukujitsuCsv', () => {
    const fixtureBuffer = readFileSync(
        join(__dirname, '__fixtures__', 'sample-syukujitsu.csv'),
    );

    it('Shift_JIS のバイト列を UTF-8 文字列へデコードできる', () => {
        const text = decodeShiftJisCsv(fixtureBuffer);
        expect(text).toContain('国民の祝日・休日月日');
        expect(text).toContain('元日');
    });

    it('ヘッダ行をスキップし、日付を YYYY-MM-DD に正規化して抽出する', () => {
        const text = decodeShiftJisCsv(fixtureBuffer);
        const rows = parseSyukujitsuCsv(text);

        expect(rows).toEqual([
            { date: '2024-01-01', name: '元日' },
            { date: '2024-01-08', name: '成人の日' },
            { date: '2024-02-11', name: '建国記念の日' },
            { date: '2024-02-12', name: '休日' },
            { date: '2024-02-23', name: '天皇誕生日' },
            { date: '2024-09-16', name: '敬老の日' },
            { date: '2024-09-22', name: '秋分の日' },
        ]);
    });

    it('Shift_JIS バッファから一気通貫でパースできる（parseSyukujitsuCsvBuffer）', () => {
        const rows = parseSyukujitsuCsvBuffer(fixtureBuffer);
        expect(rows).toHaveLength(7);
        expect(rows[0]).toEqual({ date: '2024-01-01', name: '元日' });
    });

    it('ゼロ埋めなしの月日（1桁）も正しく2桁化する', () => {
        const rows = parseSyukujitsuCsv(
            '国民の祝日・休日月日,国民の祝日・休日名称\n2024/1/1,元日',
        );
        expect(rows).toEqual([{ date: '2024-01-01', name: '元日' }]);
    });

    it('空行を無視する', () => {
        const rows = parseSyukujitsuCsv(
            '国民の祝日・休日月日,国民の祝日・休日名称\n2024/1/1,元日\n\n2024/1/8,成人の日\n',
        );
        expect(rows).toHaveLength(2);
    });
});
