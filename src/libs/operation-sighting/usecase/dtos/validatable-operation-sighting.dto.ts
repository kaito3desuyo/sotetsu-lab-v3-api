import { Type } from 'class-transformer';
import { IsDate, IsUUID } from 'class-validator';
import { BaseOperationSightingDto } from './base-operation-sighting.dto.js';

export abstract class ValidatableOperationSightingDto extends BaseOperationSightingDto {
    @IsUUID()
    id!: string;

    @IsUUID()
    formationId!: string;

    @IsUUID()
    operationId!: string;

    @IsDate()
    @Type(() => Date)
    sightingTime!: Date;
}
