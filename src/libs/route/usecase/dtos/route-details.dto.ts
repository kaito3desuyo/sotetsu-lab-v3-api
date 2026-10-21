import type { Nested } from '../../../../core/types/nested.js';
import { Expose, Type } from 'class-transformer';
import { OperatingSystemDetailsDto } from '../../../service/usecase/dtos/operating-system-details.dto.js';
import { BaseRouteDto } from './base-route.dto.js';
import { RouteStationListDetailsDto } from './route-station-list-details.dto.js';
import { AgencyDetailsDto } from '../../../agency/usecase/dtos/agency-details.dto.js';

export class RouteDetailsDto extends BaseRouteDto {
    @Expose()
    id!: string;

    @Expose()
    agencyId!: string;

    @Expose()
    routeNumber!: string;

    @Expose()
    routeName!: string;

    @Expose()
    routeNickName!: string;

    @Expose()
    routeDescription!: string;

    @Expose()
    routeType!: number;

    @Expose()
    routeUrl!: string;

    @Expose()
    routeColor!: string;

    @Expose()
    routeTextColor!: string;

    @Expose()
    createdAt!: Date;

    @Expose()
    updatedAt!: Date;

    @Expose()
    @Type(() => AgencyDetailsDto)
    agency?: Nested<AgencyDetailsDto>;

    @Expose()
    @Type(() => RouteStationListDetailsDto)
    routeStationLists?: Nested<RouteStationListDetailsDto[]>;

    @Expose()
    @Type(() => OperatingSystemDetailsDto)
    operatingSystems?: Nested<OperatingSystemDetailsDto[]>;
}
