import { Expose, Type } from 'class-transformer';
import { StationDetailsDto } from 'src/libs/station/usecase/dtos/station-details.dto';
import { ServiceDetailsDto } from './service-details.dto';

export class ServiceStationsDto {
    @Expose()
    @Type(() => ServiceDetailsDto)
    service: ServiceDetailsDto;

    @Expose()
    @Type(() => StationDetailsDto)
    stations: StationDetailsDto[];
}
