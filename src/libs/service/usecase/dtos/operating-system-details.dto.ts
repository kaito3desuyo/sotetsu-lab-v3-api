import { Nested } from 'src/core/types/nested';
import { Expose, Type } from 'class-transformer';
import { RouteDetailsDto } from 'src/libs/route/usecase/dtos/route-details.dto';
import { RouteStationListDetailsDto } from 'src/libs/route/usecase/dtos/route-station-list-details.dto';
import { BaseOperatingSystemDto } from './base-operating-system.dto';
import { ServiceDetailsDto } from './service-details.dto';

export class OperatingSystemDetailsDto extends BaseOperatingSystemDto {
    @Expose()
    id: string;

    @Expose()
    serviceId: string;

    @Expose()
    routeId: string;

    @Expose()
    startRouteStationListId: string;

    @Expose()
    endRouteStationListId: string;

    @Expose()
    sequence: number;

    @Expose()
    @Type(() => ServiceDetailsDto)
    service?: Nested<ServiceDetailsDto>;

    @Expose()
    @Type(() => RouteDetailsDto)
    route?: Nested<RouteDetailsDto>;

    @Expose()
    @Type(() => RouteStationListDetailsDto)
    startRouteStationList?: Nested<RouteStationListDetailsDto>;

    @Expose()
    @Type(() => RouteStationListDetailsDto)
    endRouteStationList?: Nested<RouteStationListDetailsDto>;
}
