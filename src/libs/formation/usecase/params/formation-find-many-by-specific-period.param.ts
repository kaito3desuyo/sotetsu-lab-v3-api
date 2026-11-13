import {
    IsDateOnly,
    IsPeriodWithin,
} from '../../../../core/validators/date-validators.js';
import { PERIOD_MAX_DAYS } from '../../../../core/validators/limits.js';

export class FormationFindManyBySpecificPeriodParam {
    @IsDateOnly()
    startDate!: string;

    @IsDateOnly()
    @IsPeriodWithin('startDate', PERIOD_MAX_DAYS)
    endDate!: string;
}
