import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString } from 'class-validator';

export class TripBlockFindManyByFilterQuery {
    @IsString()
    @IsNotEmpty()
    calendarId: string;

    @Type(() => Number)
    @IsInt()
    tripDirection: number;
}
