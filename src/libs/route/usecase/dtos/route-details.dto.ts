import { Expose, Type } from 'class-transformer';
import { OperatingSystemDetailsDto } from 'src/libs/service/usecase/dtos/operating-system-details.dto';
import { BaseRouteDto } from './base-route.dto';
import { RouteStationListDetailsDto } from './route-station-list-details.dto';

export class RouteDetailsDto extends BaseRouteDto {
    @Expose()
    id: string;

    @Expose()
    agencyId: string;

    @Expose()
    routeNumber: string;

    @Expose()
    routeName: string;

    @Expose()
    routeNickName: string;

    @Expose()
    routeDescription: string;

    @Expose()
    routeType: number;

    @Expose()
    routeUrl: string;

    @Expose()
    routeColor: string;

    @Expose()
    routeTextColor: string;

    @Expose()
    createdAt: Date;

    @Expose()
    updatedAt: Date;

    @Expose()
    @Type(() => RouteStationListDetailsDto)
    routeStationLists?: RouteStationListDetailsDto[];

    @Expose()
    @Type(() => OperatingSystemDetailsDto)
    operatingSystems?: OperatingSystemDetailsDto[];
}
