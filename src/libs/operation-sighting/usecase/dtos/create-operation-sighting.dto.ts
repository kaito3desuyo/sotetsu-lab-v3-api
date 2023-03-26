import { Exclude } from 'class-transformer';
import { IsOptional } from 'class-validator';
import { ValidatableOperationSightingDto } from './validatable-operation-sighting.dto';

export class CreateOperationSightingDto extends ValidatableOperationSightingDto {
    @IsOptional()
    @Exclude()
    id: undefined;

    formationId: string;

    operationId: string;

    sightingTime: Date;
}
