import { Type } from 'class-transformer';
import { IsInt, IsISO8601, IsOptional, Max, Min } from 'class-validator';
import { IsParsableDate } from '../../../../core/validators/date-validators.js';
import {
    SIGHTING_LIST_DEFAULT_LIMIT,
    SIGHTING_LIST_MAX_LIMIT,
} from '../../operation-sighting.constants.js';

/** 目撃の一覧の `?limit=&before=`。before はその時刻より前（created_at）の目撃だけ */
export class OperationSightingListParam {
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
