import { Type } from 'class-transformer';
import { IsInt, IsUUID } from 'class-validator';

export class TripFindManyByStationIdQuery {
    @IsUUID()
    calendarId!: string;

    @Type(() => Number)
    @IsInt()
    tripDirection!: number;
}
