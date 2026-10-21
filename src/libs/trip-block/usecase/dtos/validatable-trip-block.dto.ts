import { IsUUID } from 'class-validator';
import { BaseTripBlockDto } from './base-trip-block.dto.js';

export abstract class ValidatableTripBlockDto extends BaseTripBlockDto {
    @IsUUID()
    id: string;
}
