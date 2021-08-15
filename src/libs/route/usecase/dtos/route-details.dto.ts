import { Expose } from 'class-transformer';
import { BaseRouteDto } from './base-route.dto';

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
}
