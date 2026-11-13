import { IsDateOnly } from '../../../../core/validators/date-validators.js';

/** `/as/of/:date`。`YYYY-MM-DD` */
export class DateParam {
    @IsDateOnly()
    date!: string;
}
