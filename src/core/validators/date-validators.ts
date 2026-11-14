import dayjs from 'dayjs';
import { isISO8601, ValidateBy } from 'class-validator';
import type { ValidationArguments } from 'class-validator';

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const OFFSET_PATTERN = /(Z|[+-]\d{2}:\d{2})$/;

function isDateOnly(value: unknown): value is string {
    if (typeof value !== 'string') return false;
    const match = DATE_ONLY_PATTERN.exec(value);
    if (!match) return false;
    const [year, month, day] = [match[1], match[2], match[3]].map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return (
        date.getUTCFullYear() === year &&
        date.getUTCMonth() === month - 1 &&
        date.getUTCDate() === day
    );
}

/** `YYYY-MM-DD` で、暦にある日 */
export const IsDateOnly = (): PropertyDecorator =>
    ValidateBy({
        name: 'isDateOnly',
        validator: {
            validate: (value: unknown) => isDateOnly(value),
            defaultMessage: () =>
                '$property must be a date in YYYY-MM-DD format',
        },
    });

/** 時差の付いた ISO 8601 で、Date にできる */
export const IsInstant = (): PropertyDecorator =>
    ValidateBy({
        name: 'isInstant',
        validator: {
            validate: (value: unknown) =>
                typeof value === 'string' &&
                isISO8601(value, { strict: true, strictSeparator: true }) &&
                OFFSET_PATTERN.test(value) &&
                !Number.isNaN(new Date(value).getTime()),
            defaultMessage: () =>
                '$property must be an ISO 8601 date-time with a time zone offset',
        },
    });

/**
 * ISO 8601 の週表記（2026-W01）・序数表記（2026-123）は IsISO8601 を通るが Date にできない。
 * Date にできる値だけを通す（暦上ありえない 2026-02-30 は IsISO8601 の strict が弾く）。
 */
export const IsParsableDate = (): PropertyDecorator =>
    ValidateBy({
        name: 'isParsableDate',
        validator: {
            validate: (value: unknown) =>
                typeof value === 'string' &&
                !Number.isNaN(new Date(value).getTime()),
            defaultMessage: () => '$property must be a date that can be parsed',
        },
    });

/**
 * 付けた項目（end）が startProperty 以上で、両端を含めて maxDays 日以内。
 * どちらかが IsDateOnly でないときは何も言わない（そちらの検証に任せる）。
 */
export const IsPeriodWithin = (
    startProperty: string,
    maxDays: number,
): PropertyDecorator =>
    ValidateBy({
        name: 'isPeriodWithin',
        constraints: [startProperty, maxDays],
        validator: {
            validate: (value: unknown, args?: ValidationArguments) => {
                const start = (args?.object as Record<string, unknown>)[
                    startProperty
                ];
                if (!isDateOnly(start) || !isDateOnly(value)) return true;
                const days = dayjs(value).diff(dayjs(start), 'day') + 1;
                return days >= 1 && days <= maxDays;
            },
            defaultMessage: () =>
                `$property must be on or after ${startProperty} and within ${maxDays} days`,
        },
    });
