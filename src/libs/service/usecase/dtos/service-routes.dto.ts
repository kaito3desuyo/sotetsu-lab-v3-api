import { Expose, Type } from 'class-transformer';
import { RouteDetailsDto } from 'src/libs/route/usecase/dtos/route-details.dto';
import { ServiceDetailsDto } from './service-details.dto';

export class ServiceRoutesDto {
    @Expose()
    @Type(() => ServiceDetailsDto)
    service: ServiceDetailsDto;

    @Expose()
    @Type(() => ServiceRouteDto)
    routes: ServiceRouteDto[];
}

export class ServiceRouteDto extends RouteDetailsDto {
    @Expose()
    sequence: number;

    @Expose()
    startRouteStationListId: string;

    @Expose()
    endRouteStationListId: string;
}
