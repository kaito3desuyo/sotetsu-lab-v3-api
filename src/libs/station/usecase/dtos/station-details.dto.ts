import { Expose, Type } from 'class-transformer';
import { RouteStationListDetailsDto } from 'src/libs/route/usecase/dtos/route-station-list-details.dto';
import { TimeDetailsDto } from 'src/libs/trip/usecase/dtos/time-details.dto';
import { BaseStationDto } from './base-station.dto';
import { StopDetailsDto } from './stop-details.dto';

export class StationDetailsDto extends BaseStationDto {
    @Expose()
    id: string;

    @Expose()
    stationName: string;

    @Expose()
    stationSubname: string;

    @Expose()
    stationType: number;

    @Expose()
    stationDescription: string;

    @Expose()
    stationLatlng: string;

    @Expose()
    stationUrl: string;

    @Expose()
    wheelchairBoarding: boolean;

    @Expose()
    createdAt: Date;

    @Expose()
    updatedAt: Date;

    @Expose()
    @Type(() => RouteStationListDetailsDto)
    routeStationLists?: RouteStationListDetailsDto[];

    @Expose()
    @Type(() => StopDetailsDto)
    stops?: StopDetailsDto[];

    @Expose()
    @Type(() => TimeDetailsDto)
    times?: TimeDetailsDto[];
}
