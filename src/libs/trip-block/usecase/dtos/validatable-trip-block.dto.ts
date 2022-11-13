import { IsUUID } from 'class-validator';
import { BaseTripBlockDto } from './base-trip-block.dto';

export abstract class ValidatableTripBlockDto extends BaseTripBlockDto {
    @IsUUID()
    id: string;
}
