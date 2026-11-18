import type { Nested } from '../../../../core/types/nested.js';
import { Expose, Transform, Type } from 'class-transformer';
import { FormationDetailsDto } from '../../../formation/usecase/dtos/formation-details.dto.js';
import { OperationDetailsDto } from '../../../operation/usecase/dtos/operation-details.dto.js';
import { BaseOperationSightingDto } from './base-operation-sighting.dto.js';
import { OperationSightingInvalidationDetailsDto } from './operation-sighting-invalidation-details.dto.js';
import { OperationSightingManagementLogDetailsDto } from './operation-sighting-management-log-details.dto.js';

export class OperationSightingDetailsDto extends BaseOperationSightingDto {
    @Expose()
    id!: string;

    @Expose()
    operationSightingId!: string;

    @Expose()
    formationId!: string;

    @Expose()
    operationId!: string;

    @Expose()
    sightingTime!: Date;

    @Expose()
    createdAt!: Date;

    @Expose()
    updatedAt!: Date;

    @Expose()
    @Type(() => OperationDetailsDto)
    operation?: Nested<OperationDetailsDto>;

    @Expose()
    @Type(() => FormationDetailsDto)
    formation?: Nested<FormationDetailsDto>;

    @Expose({ name: 'invalidations' })
    @Type(() => OperationSightingInvalidationDetailsDto)
    @Transform(({ value }) => (!!value?.length ? value[0] : null), {
        toClassOnly: true,
    })
    invalidation?: Nested<OperationSightingInvalidationDetailsDto>;

    @Expose()
    @Type(() => OperationSightingManagementLogDetailsDto)
    managementLogs?: Nested<OperationSightingManagementLogDetailsDto[]>;

    /** 引き継いだ目撃のとき、目撃されたときの運用。直接の目撃には無い */
    @Expose()
    sightedAsOperation?: { operationId: string; operationNumber: string };

    /** 引き継いだ目撃（写し）のとき、元の目撃の operationSightingId（`#` の付かない id）。直接の目撃には無い */
    @Expose()
    carriedFromSightingId?: string;

    /** 引き継いだ目撃（写し）のとき、写した枠の始まり（鉄道日の 0 時からの秒）。どの枠の写しかを示す。直接の目撃には無い */
    @Expose()
    carriedRunStartSeconds?: number;
}
