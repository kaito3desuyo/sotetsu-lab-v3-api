import type { Nested } from '../../../../core/types/nested.js';
import { Expose, Type } from 'class-transformer';
import { RouteDetailsDto } from '../../../route/usecase/dtos/route-details.dto.js';
import { ServiceDetailsDto } from './service-details.dto.js';

export class ServiceRoutesDto {
    @Expose()
    @Type(() => ServiceDetailsDto)
    service!: Nested<ServiceDetailsDto>;

    @Expose()
    @Type(() => ServiceRouteDto)
    routes!: Nested<ServiceRouteDto[]>;
}

export class ServiceRouteDto extends RouteDetailsDto {
    @Expose()
    sequence!: number;

    @Expose()
    startRouteStationListId!: string;

    @Expose()
    endRouteStationListId!: string;
}
