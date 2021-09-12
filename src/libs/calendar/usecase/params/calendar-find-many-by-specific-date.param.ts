import { IsISO8601 } from 'class-validator';

export class CalendarFindManyBySpecificDateParam {
    @IsISO8601()
    date: string;
}
