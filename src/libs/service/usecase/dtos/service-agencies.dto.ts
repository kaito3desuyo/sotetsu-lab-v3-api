import { Expose, Type } from 'class-transformer';
import { AgencyDetailsDto } from 'src/libs/agency/usecase/dtos/agency-details.dto';
import { ServiceDetailsDto } from './service-details.dto';

export class ServiceAgenciesDto {
    @Expose()
    @Type(() => ServiceDetailsDto)
    service: ServiceDetailsDto;

    @Expose()
    @Type(() => AgencyDetailsDto)
    agencies: AgencyDetailsDto[];
}
