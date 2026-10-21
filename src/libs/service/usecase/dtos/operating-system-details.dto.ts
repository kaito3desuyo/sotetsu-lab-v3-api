import type { Nested } from '../../../../core/types/nested.js';
import { Expose, Type } from 'class-transformer';
import { RouteDetailsDto } from '../../../route/usecase/dtos/route-details.dto.js';
import { RouteStationListDetailsDto } from '../../../route/usecase/dtos/route-station-list-details.dto.js';
import { BaseOperatingSystemDto } from './base-operating-system.dto.js';
import { ServiceDetailsDto } from './service-details.dto.js';

export class OperatingSystemDetailsDto extends BaseOperatingSystemDto {
    @Expose()
    id!: string;

    @Expose()
    serviceId!: string;

    @Expose()
    routeId!: string;

    @Expose()
    startRouteStationListId!: string;

    @Expose()
    endRouteStationListId!: string;

    @Expose()
    sequence!: number;

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
