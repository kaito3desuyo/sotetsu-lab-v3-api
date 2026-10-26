import { IsUUID } from 'class-validator';

export class CalendarDateIdParam {
    @IsUUID()
    id!: string;
}
