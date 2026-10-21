import type { Nested } from '../../../../core/types/nested.js';
import { Expose, Type } from 'class-transformer';
import { StationDetailsDto } from '../../../station/usecase/dtos/station-details.dto.js';
import { BaseRouteStationListDto } from './base-route-station-list.dto.js';
import { RouteDetailsDto } from './route-details.dto.js';

export class RouteStationListDetailsDto extends BaseRouteStationListDto {
    @Expose()
    id!: string;

    @Expose()
    routeId!: string;

    @Expose()
    stationId!: string;

    @Expose()
    stationSequence!: number;

    @Expose()
    stationNumbering!: string;

    @Expose()
    @Type(() => RouteDetailsDto)
    route?: Nested<RouteDetailsDto>;

    @Expose()
    @Type(() => StationDetailsDto)
    station?: Nested<StationDetailsDto>;
}
