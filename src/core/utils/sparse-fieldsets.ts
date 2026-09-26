import { BadRequestException } from '@nestjs/common';

/** 資源名 → 返す項目の集合（docs/adr/0002-v3-sparse-fieldsets.md） */
export type SparseFieldsets = ReadonlyMap<string, ReadonlySet<string>>;

/** 資源名 → 選んでよい項目の許可リスト */
export type FieldsetWhitelist = Readonly<Record<string, readonly string[]>>;

/** 子の資源名 → それを結合するのに要る親の資源名 */
export type FieldsetRequires = Readonly<Record<string, string>>;

/**
 * クエリの `fields[資源]=項目,項目` を読み、許可リストで検める。
 * 指定が無ければ undefined（全項目を返す既定のまま）。
 * 許可リストに無い資源・項目、親の資源が欠けた指定、文字列でない値は 400 にする。
 */
export function parseSparseFieldsets(
    raw: unknown,
    whitelist: FieldsetWhitelist,
    requires: FieldsetRequires = {},
): SparseFieldsets | undefined {
    if (raw === undefined || raw === null) {
        return undefined;
    }
    if (typeof raw !== 'object' || Array.isArray(raw)) {
        throw new BadRequestException(
            'fields は fields[資源]=項目,項目 の形で指定する',
        );
    }

    const result = new Map<string, Set<string>>();
    for (const [resource, value] of Object.entries(raw)) {
        const allowed = whitelist[resource];
        if (!allowed) {
            throw new BadRequestException(
                `fields に指定できない資源: ${resource}`,
            );
        }
        const values = Array.isArray(value) ? value : [value];
        if (values.some((v) => typeof v !== 'string')) {
            throw new BadRequestException(
                `fields[${resource}] は文字列で指定する`,
            );
        }
        const fields = new Set(
            (values as string[])
                .flatMap((v) => v.split(','))
                .map((field) => field.trim())
                .filter((field) => field !== ''),
        );
        for (const field of fields) {
            if (!allowed.includes(field)) {
                throw new BadRequestException(
                    `fields[${resource}] に指定できない項目: ${field}`,
                );
            }
        }
        result.set(resource, fields);
    }

    for (const [child, parent] of Object.entries(requires)) {
        if (result.has(child) && !result.has(parent)) {
            throw new BadRequestException(
                `fields[${child}] には fields[${parent}] の指定も要る`,
            );
        }
    }

    return result;
}

/**
 * 指定した項目と常に返す項目だけを取り出す。値が null・undefined の項目は省く
 * （`fields` を指定したときの応答を軽くするため。false・0・空文字は残す）。
 */
export function pickFields(
    source: object,
    fields: ReadonlySet<string>,
    alwaysKeys: readonly string[] = [],
): Record<string, unknown> {
    const record = source as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    for (const key of [...alwaysKeys, ...fields]) {
        const value = record[key];
        if (value !== null && value !== undefined) {
            result[key] = value;
        }
    }
    return result;
}
