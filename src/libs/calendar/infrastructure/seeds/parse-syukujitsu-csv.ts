export interface SyukujitsuCsvRow {
    /** YYYY-MM-DD */
    date: string;
    name: string;
}

/**
 * 内閣府「国民の祝日」CSV は Shift_JIS でエンコードされている。
 * Node.js (v13+, full-icu 同梱) の TextDecoder はビルトインで 'shift_jis' をサポートするため
 * 追加の依存ライブラリなしでデコードできる。
 */
export function decodeShiftJisCsv(buffer: Buffer): string {
    return new TextDecoder('shift_jis').decode(buffer);
}

/**
 * 内閣府「国民の祝日」CSV（ヘッダ行 + `YYYY/M/D,名称` 形式、UTF-8 に変換済みのテキスト）をパースする純関数。
 */
export function parseSyukujitsuCsv(csvText: string): SyukujitsuCsvRow[] {
    const lines = csvText
        .split(/\r\n|\n|\r/)
        .filter((line) => line.trim().length > 0);

    // 1行目はヘッダ（"国民の祝日・休日月日,国民の祝日・休日名称"）なのでスキップする
    const dataLines = lines.slice(1);

    return dataLines.map((line) => {
        const [rawDate, rawName] = splitCsvLine(line);
        return {
            date: normalizeDate(rawDate),
            name: rawName,
        };
    });
}

/**
 * CSV バイト列（Shift_JIS）から祝日一覧を得るまでを一気通貫で行う。
 */
export function parseSyukujitsuCsvBuffer(buffer: Buffer): SyukujitsuCsvRow[] {
    return parseSyukujitsuCsv(decodeShiftJisCsv(buffer));
}

function splitCsvLine(line: string): [string, string] {
    const commaIndex = line.indexOf(',');
    if (commaIndex === -1) {
        return [line.trim(), ''];
    }
    return [
        line.slice(0, commaIndex).trim(),
        line.slice(commaIndex + 1).trim(),
    ];
}

function normalizeDate(rawDate: string): string {
    const [year, month, day] = rawDate.split('/').map((part) => part.trim());
    return `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}
