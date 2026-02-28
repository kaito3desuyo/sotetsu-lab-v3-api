import { plainToClass } from 'class-transformer';
import { transformerOptions } from 'src/core/configs/transformer-options';
import { RouteDetailsDto } from '../../usecase/dtos/route-details.dto';
import { RouteStationsDto } from '../../usecase/dtos/route-stations.dto';
import { RouteModel } from '../models/route.model';

export function buildRouteDetailsDto(model: RouteModel): RouteDetailsDto {
    return plainToClass(RouteDetailsDto, model, transformerOptions);
}

export const RouteDtoBuilder = {
    toStationsDto: (model: RouteModel) => {
        const sortedStations = [...(model.routeStationLists ?? [])].sort(
            (a, b) => a.stationSequence - b.stationSequence,
        );

        const data = {
            route: {
                id: model.id,
                agencyId: model.agencyId,
                routeNumber: model.routeNumber,
                routeName: model.routeName,
                routeNickname: model.routeNickname,
                routeDescription: model.routeDescription,
                routeType: model.routeType,
                routeUrl: model.routeUrl,
                routeColor: model.routeColor,
                routeTextColor: model.routeTextColor,
                createdAt: model.createdAt,
                updatedAt: model.updatedAt,
            },
            stations: sortedStations.map((rsl) => ({
                ...rsl.station,
                stationSequence: rsl.stationSequence,
                stationNumbering: rsl.stationNumbering,
            })),
        };

        return plainToClass(RouteStationsDto, data, transformerOptions);
    },
} as const;
