import { Exclude } from 'class-transformer';
import { IsOptional } from 'class-validator';
import { ValidatableOperationSightingDto } from './validatable-operation-sighting.dto.js';

export class CreateOperationSightingDto extends ValidatableOperationSightingDto<undefined> {
    @IsOptional()
    @Exclude()
    id: undefined;

    formationId!: string;

    operationId!: string;

    sightingTime!: Date;
}
