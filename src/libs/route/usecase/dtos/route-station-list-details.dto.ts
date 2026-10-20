import { Nested } from 'src/core/types/nested';
import { Expose, Type } from 'class-transformer';
import { StationDetailsDto } from 'src/libs/station/usecase/dtos/station-details.dto';
import { BaseRouteStationListDto } from './base-route-station-list.dto';
import { RouteDetailsDto } from './route-details.dto';

export class RouteStationListDetailsDto extends BaseRouteStationListDto {
    @Expose()
    id: string;

    @Expose()
    routeId: string;

    @Expose()
    stationId: string;

    @Expose()
    stationSequence: number;

    @Expose()
    stationNumbering: string;

    @Expose()
    @Type(() => RouteDetailsDto)
    route?: Nested<RouteDetailsDto>;

    @Expose()
    @Type(() => StationDetailsDto)
    station?: Nested<StationDetailsDto>;
}
