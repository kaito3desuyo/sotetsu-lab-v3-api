import { PERIOD_MAX_DAYS } from '../../../../core/validators/limits.js';
import {
    IsDateOnly,
    IsPeriodWithin,
} from '../../../../core/validators/date-validators.js';

/** `/from/:start/to/:end`。日付は `YYYY-MM-DD`・両端を含めて 31 日まで */
export class PeriodParam {
    @IsDateOnly()
    start!: string;

    @IsDateOnly()
    @IsPeriodWithin('start', PERIOD_MAX_DAYS)
    end!: string;
}
