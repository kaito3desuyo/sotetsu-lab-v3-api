import { IsUUID } from 'class-validator';

export class OperationCalendarIdParam {
    @IsUUID()
    calendarId!: string;
}
