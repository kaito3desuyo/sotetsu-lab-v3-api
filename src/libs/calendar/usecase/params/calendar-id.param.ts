import { IsUUID } from 'class-validator';

export class CalendarIdParam {
    @IsUUID()
    id!: string;
}
