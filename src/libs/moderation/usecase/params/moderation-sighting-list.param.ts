import { Type } from 'class-transformer';
import { IsInt, IsISO8601, IsOptional, Max, Min } from 'class-validator';
import {
    SIGHTING_LIST_DEFAULT_LIMIT,
    SIGHTING_LIST_MAX_LIMIT,
} from '../../moderation.constants.js';

/** 目撃の一覧の `?limit=&before=`。before はその時刻より前（created_at）の目撃だけ */
export class ModerationSightingListParam {
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(SIGHTING_LIST_MAX_LIMIT)
    limit: number = SIGHTING_LIST_DEFAULT_LIMIT;

    @IsOptional()
    @IsISO8601()
    before?: string;
}
