import { Type } from 'class-transformer';
import { IsDate, IsUUID } from 'class-validator';
import { BaseOperationSightingDto } from './base-operation-sighting.dto.js';

export abstract class ValidatableOperationSightingDto<
    Id extends string | undefined = string,
> extends BaseOperationSightingDto<Id> {
    @IsUUID()
    id!: Id;

    @IsUUID()
    formationId!: string;

    @IsUUID()
    operationId!: string;

    @IsDate()
    @Type(() => Date)
    sightingTime!: Date;
}
