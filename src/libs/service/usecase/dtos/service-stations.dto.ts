import { Nested } from 'src/core/types/nested';
import { Expose, Type } from 'class-transformer';
import { StationDetailsDto } from 'src/libs/station/usecase/dtos/station-details.dto';
import { ServiceDetailsDto } from './service-details.dto';

export class ServiceStationsDto {
    @Expose()
    @Type(() => ServiceDetailsDto)
    service: Nested<ServiceDetailsDto>;

    @Expose()
    @Type(() => StationDetailsDto)
    stations: Nested<StationDetailsDto[]>;
}
