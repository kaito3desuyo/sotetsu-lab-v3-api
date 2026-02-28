import { Expose, Type } from 'class-transformer';
import { RouteDetailsDto } from './route-details.dto';
import { StationDetailsDto } from 'src/libs/station/usecase/dtos/station-details.dto';

export class RouteStationsDto {
    @Expose()
    @Type(() => RouteDetailsDto)
    route: RouteDetailsDto;

    @Expose()
    @Type(() => RouteStationDto)
    stations: RouteStationDto[];
}

export class RouteStationDto extends StationDetailsDto {
    @Expose()
    stationSequence: number;

    @Expose()
    stationNumbering: string;
}
