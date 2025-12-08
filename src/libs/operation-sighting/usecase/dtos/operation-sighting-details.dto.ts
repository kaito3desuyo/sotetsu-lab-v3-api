import { Expose, Transform, Type } from 'class-transformer';
import { FormationDetailsDto } from 'src/libs/formation/usecase/dtos/formation-details.dto';
import { OperationDetailsDto } from 'src/libs/operation/usecase/dtos/operation-details.dto';
import { BaseOperationSightingDto } from './base-operation-sighting.dto';
import { OperationSightingInvalidationDetailsDto } from './operation-sighting-invalidation-details.dto';
import { OperationSightingManagementLogDetailsDto } from './operation-sighting-management-log-details.dto';

export class OperationSightingDetailsDto extends BaseOperationSightingDto {
    @Expose()
    id: string;

    @Expose()
    operationSightingId: string;

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

    @Expose({ name: 'invalidations' })
    @Type(() => OperationSightingInvalidationDetailsDto)
    @Transform(({ value }) => (!!value?.length ? value[0] : null), {
        toClassOnly: true,
    })
    invalidation?: OperationSightingInvalidationDetailsDto;

    @Expose()
    @Type(() => OperationSightingManagementLogDetailsDto)
    managementLogs?: OperationSightingManagementLogDetailsDto[];
}
