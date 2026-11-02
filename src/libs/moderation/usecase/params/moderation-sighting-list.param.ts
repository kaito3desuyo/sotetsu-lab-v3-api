import { Type } from 'class-transformer';
import {
    IsInt,
    IsISO8601,
    IsOptional,
    Max,
    Min,
    ValidateBy,
} from 'class-validator';
import {
    SIGHTING_LIST_DEFAULT_LIMIT,
    SIGHTING_LIST_MAX_LIMIT,
} from '../../moderation.constants.js';

/**
 * ISO 8601 の週表記（2026-W01）・序数表記（2026-123）は IsISO8601 を通るが Date にできない。
 * Date にできる値だけを通す（暦上ありえない 2026-02-30 は IsISO8601 の strict が弾く）。
 */
const IsParsableDate = () =>
    ValidateBy({
        name: 'isParsableDate',
        validator: {
            validate: (value: unknown) =>
                typeof value === 'string' &&
                !Number.isNaN(new Date(value).getTime()),
            defaultMessage: () => '$property must be a date that can be parsed',
        },
    });

/** 目撃の一覧の `?limit=&before=`。before はその時刻より前（created_at）の目撃だけ */
export class ModerationSightingListParam {
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(SIGHTING_LIST_MAX_LIMIT)
    limit: number = SIGHTING_LIST_DEFAULT_LIMIT;

    @IsOptional()
    @IsISO8601({ strict: true, strictSeparator: true })
    @IsParsableDate()
    before?: string;
}
