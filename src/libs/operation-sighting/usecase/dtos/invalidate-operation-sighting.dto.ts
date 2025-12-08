import { Exclude } from 'class-transformer';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class InvalidateOperationSightingDto {
    @IsOptional()
    @Exclude()
    operationSightingId: string;

    @IsUUID()
    userId: string;

    @IsString()
    reason: string;
}
