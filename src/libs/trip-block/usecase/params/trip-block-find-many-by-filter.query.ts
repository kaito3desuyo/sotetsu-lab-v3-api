import { Type } from 'class-transformer';
import {
    IsInt,
    IsNotEmpty,
    IsObject,
    IsOptional,
    IsString,
} from 'class-validator';

export class TripBlockFindManyByFilterQuery {
    @IsString()
    @IsNotEmpty()
    calendarId: string;

    @Type(() => Number)
    @IsInt()
    tripDirection: number;

    /**
     * 返す項目の選択 `fields[資源]=項目,項目`（docs/adr/0002-v3-sparse-fieldsets.md）。
     * 中身の検め（許可リスト）はサービスで行う。
     */
    @IsOptional()
    @IsObject()
    fields?: Record<string, string | string[]>;
}
