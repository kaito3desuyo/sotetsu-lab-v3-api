import { IsOptional, IsUUID } from 'class-validator';
import { IsDateOnly } from '../../../../core/validators/date-validators.js';

export class CalendarDateFindManyParam {
    @IsOptional()
    @IsUUID()
    calendarId?: string;

    @IsOptional()
    @IsDateOnly()
    from?: string;

    @IsOptional()
    @IsDateOnly()
    to?: string;
}
