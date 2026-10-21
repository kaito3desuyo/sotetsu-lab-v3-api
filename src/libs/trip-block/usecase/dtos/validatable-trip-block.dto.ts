import { IsUUID } from 'class-validator';
import { BaseTripBlockDto } from './base-trip-block.dto.js';

export abstract class ValidatableTripBlockDto<
    Id extends string | undefined = string,
> extends BaseTripBlockDto<Id> {
    @IsUUID()
    id!: Id;
}
