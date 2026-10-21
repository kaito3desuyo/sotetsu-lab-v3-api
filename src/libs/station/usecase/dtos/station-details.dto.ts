import type { Nested } from '../../../../core/types/nested.js';
import { Expose, Type } from 'class-transformer';
import { RouteStationListDetailsDto } from '../../../route/usecase/dtos/route-station-list-details.dto.js';
import { TimeDetailsDto } from '../../../trip/usecase/dtos/time-details.dto.js';
import { BaseStationDto } from './base-station.dto.js';
import { StopDetailsDto } from './stop-details.dto.js';

export class StationDetailsDto extends BaseStationDto {
    @Expose()
    id!: string;

    @Expose()
    stationName!: string;

    @Expose()
    stationSubname!: string;

    @Expose()
    stationType!: number;

    @Expose()
    stationDescription!: string;

    @Expose()
    stationLatlng!: string;

    @Expose()
    stationUrl!: string;

    @Expose()
    wheelchairBoarding!: boolean;

    @Expose()
    createdAt!: Date;

    @Expose()
    updatedAt!: Date;

    @Expose()
    @Type(() => RouteStationListDetailsDto)
    routeStationLists?: Nested<RouteStationListDetailsDto[]>;

    @Expose()
    @Type(() => StopDetailsDto)
    stops?: Nested<StopDetailsDto[]>;

    @Expose()
    @Type(() => TimeDetailsDto)
    times?: Nested<TimeDetailsDto[]>;
}
