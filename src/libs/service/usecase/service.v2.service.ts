import { CrudRequest, GetManyDefaultResponse } from '@dataui/crud';
import { Injectable } from '@nestjs/common';
import { cloneDeep, mergeWith, omit, sortBy } from 'lodash';
import { crudReqMergeCustomizer } from 'src/core/utils/merge-customizer';
import { RouteStationListDetailsDto } from 'src/libs/route/usecase/dtos/route-station-list-details.dto';
import { StationDetailsDto } from 'src/libs/station/usecase/dtos/station-details.dto';
import { ServiceQuery } from '../infrastructure/queries/service.query';
import { ServiceDetailsDto } from './dtos/service-details.dto';

@Injectable()
export class ServiceV2Service {
    constructor(private readonly serviceQuery: ServiceQuery) {}

    findMany(
        query: CrudRequest,
    ): Promise<
        ServiceDetailsDto[] | GetManyDefaultResponse<ServiceDetailsDto>
    > {
        return this.serviceQuery.findManyServices(query);
    }

    findOne(query: CrudRequest): Promise<ServiceDetailsDto> {
        return this.serviceQuery.findOneService(query);
    }

    async findOneWithStations(query: CrudRequest): Promise<any> {
        const dto = await this.serviceQuery.findOneService(
            mergeWith(
                {
                    parsed: {
                        join: [
                            {
                                field: 'operatingSystems',
                            },
                            {
                                field: 'operatingSystems.route',
                            },
                            {
                                field: 'operatingSystems.route.routeStationLists',
                            },
                            {
                                field: 'operatingSystems.route.routeStationLists.station',
                            },
                            {
                                field: 'operatingSystems.startRouteStationList',
                            },
                            {
                                field: 'operatingSystems.endRouteStationList',
                            },
                        ],
                        sort: [
                            {
                                field: 'operatingSystems.sequence',
                                order: 'ASC',
                            },
                            {
                                field: 'operatingSystems.route.routeStationLists.stationSequence',
                                order: 'ASC',
                            },
                        ],
                    },
                },
                query,
                crudReqMergeCustomizer,
            ),
        );

        const pickedRouteStationLists: (RouteStationListDetailsDto & {
            priority?: number;
        })[] = [];
        for (const operatingSystem of dto.operatingSystems) {
            const sortedRouteStationLists =
                operatingSystem.startRouteStationList.stationSequence <
                operatingSystem.endRouteStationList.stationSequence
                    ? sortBy(
                          operatingSystem.route.routeStationLists,
                          (o) => o.stationSequence,
                      )
                    : sortBy(
                          operatingSystem.route.routeStationLists,
                          (o) => o.stationSequence,
                      ).reverse();

            const initialPosition = cloneDeep(pickedRouteStationLists)
                .reverse()
                .findIndex(
                    (o) =>
                        o.stationId ===
                        operatingSystem.startRouteStationList.stationId,
                );

            let position =
                initialPosition !== -1
                    ? pickedRouteStationLists.length - 1 - initialPosition
                    : pickedRouteStationLists.length - 1;

            const startStationIndex = sortedRouteStationLists.findIndex(
                (o) =>
                    o.stationId ===
                    operatingSystem.startRouteStationList.stationId,
            );
            const endStationIndex = sortedRouteStationLists.findIndex(
                (o) =>
                    o.stationId ===
                    operatingSystem.endRouteStationList.stationId,
            );

            for (const sortedRouteStationList of sortedRouteStationLists.filter(
                (_, i) => startStationIndex <= i && i <= endStationIndex,
            )) {
                if (
                    operatingSystem.route.routeName === '厚木線' ||
                    operatingSystem.route.routeName === '副都心線' ||
                    operatingSystem.route.routeName === '有楽町線'
                ) {
                    pickedRouteStationLists.push({
                        ...sortedRouteStationList,
                        priority: 1,
                    });
                    position = pickedRouteStationLists.length - 1;
                } else if (operatingSystem.route.routeName === '西武有楽町線') {
                    pickedRouteStationLists.push({
                        ...sortedRouteStationList,
                        priority: 2,
                    });
                    position = pickedRouteStationLists.length - 1;
                } else {
                    pickedRouteStationLists.splice(position + 1, 0, {
                        ...sortedRouteStationList,
                        priority: 0,
                    });
                    position++;
                }

                if (
                    operatingSystem.startRouteStationListId !==
                        sortedRouteStationList.id &&
                    operatingSystem.endRouteStationListId !==
                        sortedRouteStationList.id &&
                    pickedRouteStationLists.some(
                        (o) =>
                            o.id !== sortedRouteStationList.id &&
                            o.stationId === sortedRouteStationList.stationId,
                    )
                ) {
                    position++;
                }
            }
        }

        const stations: StationDetailsDto[] = [];
        for (let i = 0; i < pickedRouteStationLists.length; i++) {
            if (
                pickedRouteStationLists[i].stationId ===
                pickedRouteStationLists[i + 1]?.stationId
            ) {
                continue;
            }

            if (
                pickedRouteStationLists.some(
                    (o, n) =>
                        i < n &&
                        o.id !== pickedRouteStationLists[i].id &&
                        o.stationId === pickedRouteStationLists[i].stationId &&
                        o.priority <= 0,
                )
            ) {
                continue;
            }

            if (
                pickedRouteStationLists[i].priority >= 2 &&
                pickedRouteStationLists.some(
                    (o, n) =>
                        i < n &&
                        o.id !== pickedRouteStationLists[i].id &&
                        o.stationId === pickedRouteStationLists[i].stationId,
                )
            ) {
                continue;
            }

            if (
                pickedRouteStationLists[i].priority >= 1 &&
                pickedRouteStationLists.some(
                    (o, n) =>
                        n < i &&
                        o.id !== pickedRouteStationLists[i].id &&
                        o.stationId === pickedRouteStationLists[i].stationId &&
                        o.priority <= 1,
                )
            ) {
                continue;
            }

            stations.push(pickedRouteStationLists[i].station);
        }

        return {
            service: omit(dto, 'operatingSystems'),
            stations,
        };
    }
}
