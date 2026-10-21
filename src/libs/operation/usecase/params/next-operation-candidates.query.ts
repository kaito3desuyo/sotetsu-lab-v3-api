import { IsOptional, IsString } from 'class-validator';
import { OperationCalendarQuery } from './operation-calendar.query.js';

/** 「次の運用」の候補のクエリ。`stationId` で始まり、`afterSeconds` 以降の区間 */
export class NextOperationCandidatesQuery extends OperationCalendarQuery {
    @IsOptional()
    @IsString()
    stationId?: string;

    @IsOptional()
    @IsString()
    afterSeconds?: string;
}
