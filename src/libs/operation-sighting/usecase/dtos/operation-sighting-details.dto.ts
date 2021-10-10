import { Expose, Type } from 'class-transformer';
import { FormationDetailsDto } from 'src/libs/formation/usecase/dtos/formation-details.dto';
import { OperationDetailsDto } from 'src/libs/operation/usecase/dtos/operation-details.dto';
import { BaseOperationSightingDto } from './base-operation-sighting.dto';

export class OperationSightingDetailsDto extends BaseOperationSightingDto {
    @Expose()
    id: string;

    @Expose()
    formationId: string;

    @Expose()
    operationId: string;

    @Expose()
    sightingTime: Date;

    @Expose()
    createdAt: Date;

    @Expose()
    updatedAt: Date;

    @Expose()
    @Type(() => OperationDetailsDto)
    operation?: OperationDetailsDto;

    @Expose()
    @Type(() => FormationDetailsDto)
    formation?: FormationDetailsDto;
}
