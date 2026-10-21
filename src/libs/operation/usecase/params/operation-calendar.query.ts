import { IsUUID } from 'class-validator';

/** カレンダーで絞るクエリ（`?calendarId=…`）。必須・UUID */
export class OperationCalendarQuery {
    @IsUUID()
    calendarId!: string;
}
