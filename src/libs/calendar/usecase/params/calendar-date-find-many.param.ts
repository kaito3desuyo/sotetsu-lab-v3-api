import { IsISO8601, IsOptional, IsUUID } from 'class-validator';

export class CalendarDateFindManyParam {
    @IsOptional()
    @IsUUID()
    calendarId?: string;

    @IsOptional()
    @IsISO8601()
    from?: string;

    @IsOptional()
    @IsISO8601()
    to?: string;
}
