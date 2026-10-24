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
    calendarId!: string;

    @Type(() => Number)
    @IsInt()
    tripDirection!: number;

    /**
     * 結合する関連の道筋 `include=trips.times,trips.tripClass`（docs/adr/0010-v3-include-and-fields.md）。
     * 形の検め（文字列または文字列の配列）と中身の検め（木）は、サービスの parseSelection で行い、崩れていれば 400 を返す。
     * ここでは検めない（ValidationPipe の 422 にしない）が、whitelist で落とされないよう装飾は残す。
     */
    @IsOptional()
    include?: unknown;

    /**
     * 返す項目の選択 `fields[資源]=項目,項目`（docs/adr/0010-v3-include-and-fields.md）。
     * 中身の検め（木）はサービスで行う。
     */
    @IsOptional()
    @IsObject()
    fields?: Record<string, string | string[]>;
}
