import type { Nested } from '../../../../core/types/nested.js';
import { Expose, Type } from 'class-transformer';
import { RouteDetailsDto } from './route-details.dto.js';
import { StationDetailsDto } from '../../../station/usecase/dtos/station-details.dto.js';

export class RouteStationsDto {
    @Expose()
    @Type(() => RouteDetailsDto)
    route!: Nested<RouteDetailsDto>;

    @Expose()
    @Type(() => RouteStationDto)
    stations!: Nested<RouteStationDto[]>;
}

export class RouteStationDto extends StationDetailsDto {
    @Expose()
    stationSequence!: number;

    @Expose()
    stationNumbering!: string;
}
