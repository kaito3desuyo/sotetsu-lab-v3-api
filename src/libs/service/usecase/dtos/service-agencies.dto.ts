import { Nested } from 'src/core/types/nested';
import { Expose, Type } from 'class-transformer';
import { AgencyDetailsDto } from 'src/libs/agency/usecase/dtos/agency-details.dto';
import { ServiceDetailsDto } from './service-details.dto';

export class ServiceAgenciesDto {
    @Expose()
    @Type(() => ServiceDetailsDto)
    service: Nested<ServiceDetailsDto>;

    @Expose()
    @Type(() => AgencyDetailsDto)
    agencies: Nested<AgencyDetailsDto[]>;
}
