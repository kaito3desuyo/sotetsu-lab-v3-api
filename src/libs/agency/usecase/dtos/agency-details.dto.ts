import type { Nested } from '../../../../core/types/nested.js';
import { Expose, Type } from 'class-transformer';
import { RouteDetailsDto } from '../../../route/usecase/dtos/route-details.dto.js';
import { BaseAgencyDto } from './base-agency.dto.js';

export class AgencyDetailsDto extends BaseAgencyDto {
    @Expose()
    id: string;

    @Expose()
    agencyNumber: string;

    @Expose()
    parentAgencyNumber: string;

    @Expose()
    agencyOfficialName: string;

    @Expose()
    agencyName: string;

    @Expose()
    agencyType: number;

    @Expose()
    agencyUrl: string;

    @Expose()
    agencyPhone: string;

    @Expose()
    agencyFareUrl: string;

    @Expose()
    createdAt: Date;

    @Expose()
    updatedAt: Date;

    @Expose()
    @Type(() => RouteDetailsDto)
    routes?: Nested<RouteDetailsDto[]>;
}
