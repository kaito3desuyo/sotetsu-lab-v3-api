import { IsString } from 'class-validator';

export class RestoreOperationSightingDto {
    @IsString()
    reason!: string;
}
