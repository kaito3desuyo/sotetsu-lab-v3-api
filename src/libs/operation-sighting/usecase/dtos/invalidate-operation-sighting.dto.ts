import { IsString } from 'class-validator';

export class InvalidateOperationSightingDto {
    @IsString()
    reason!: string;
}
