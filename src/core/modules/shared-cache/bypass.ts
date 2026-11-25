/** 要求の Cache-Control か Pragma に no-cache が付いていれば true */
export function wantsFreshRead(headers: {
    cacheControl?: string;
    pragma?: string;
}): boolean {
    return [headers.cacheControl, headers.pragma].some((value) =>
        (value ?? '')
            .split(',')
            .some((directive) => directive.trim().toLowerCase() === 'no-cache'),
    );
}

/** カンマ区切り（配列でもよい）を、空を除いて重複なしの並べ替えた一覧にする */
function normalizeList(value: unknown): string[] {
    const parts = Array.isArray(value) ? value : [value];
    const items = parts
        .flatMap((part) => String(part).split(','))
        .map((item) => item.trim())
        .filter((item) => item !== '');
    return [...new Set(items)].sort();
}

/** 指定はあるが中身が空（`?include=` など）の印。指定が無い（''）のと別のキーにする */
const EMPTY_MARK = '[]';

/** include・fields を、キーの順と項目の並びを揃えた 1 本の文字列にする（無ければ ''） */
export function selectionCacheKey(params: {
    include?: unknown;
    fields?: unknown;
}): string {
    const { include, fields } = params;
    const includePart =
        include === undefined || include === null
            ? ''
            : normalizeList(include).join(',') || EMPTY_MARK;
    const fieldsPart =
        fields !== null && typeof fields === 'object'
            ? Object.entries(fields)
                  .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
                  .map(
                      ([resource, value]) =>
                          `${resource}:${normalizeList(value).join(',')}`,
                  )
                  .join('|') || EMPTY_MARK
            : '';
    if (includePart === '' && fieldsPart === '') {
        return '';
    }
    return `include=${includePart};fields=${fieldsPart}`;
}
