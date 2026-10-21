import type { Nested } from '../../../../core/types/nested.js';
import { Expose, Type } from 'class-transformer';
import { AgencyDetailsDto } from '../../../agency/usecase/dtos/agency-details.dto.js';
import { ServiceDetailsDto } from './service-details.dto.js';

export class ServiceAgenciesDto {
    @Expose()
    @Type(() => ServiceDetailsDto)
    service: Nested<ServiceDetailsDto>;

    @Expose()
    @Type(() => AgencyDetailsDto)
    agencies: Nested<AgencyDetailsDto[]>;
}
