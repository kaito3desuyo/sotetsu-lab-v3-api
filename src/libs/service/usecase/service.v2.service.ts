import { Injectable } from '@nestjs/common';
import { CrudRequest, GetManyDefaultResponse } from '@nestjsx/crud';
import { findIndex, mergeWith, omit, some, sortBy } from 'lodash';
import { crudReqMergeCustomizer } from 'src/core/util/merge-customizer';
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
                                field:
                                    'operatingSystems.route.routeStationLists',
                            },
                            {
                                field:
                                    'operatingSystems.route.routeStationLists.station',
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
                                field:
                                    'operatingSystems.route.routeStationLists.stationSequence',
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
            isLowPriority?: boolean;
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

            const initialPosition = findIndex(
                pickedRouteStationLists,
                (o) =>
                    o.stationId ===
                    operatingSystem.startRouteStationList.stationId,
            );

            let position = initialPosition;
            if (initialPosition === -1) {
                position = pickedRouteStationLists.length - 1;
            }

            const startStationIndex = findIndex(
                sortedRouteStationLists,
                (o) =>
                    o.stationId ===
                    operatingSystem.startRouteStationList.stationId,
            );
            const endStationIndex = findIndex(
                sortedRouteStationLists,
                (o) =>
                    o.stationId ===
                    operatingSystem.endRouteStationList.stationId,
            );

            for (const sortedRouteStationList of sortedRouteStationLists.filter(
                (_, i) => startStationIndex <= i && i <= endStationIndex,
            )) {
                if (operatingSystem.route.routeName === '厚木線') {
                    pickedRouteStationLists.push({
                        ...sortedRouteStationList,
                        isLowPriority: true,
                    });
                    position = pickedRouteStationLists.length - 1;
                } else {
                    pickedRouteStationLists.splice(
                        position + 1,
                        0,
                        sortedRouteStationList,
                    );
                    position++;
                }
            }
        }

        const stations: StationDetailsDto[] = [];
        for (let i = 0; i < pickedRouteStationLists.length; i++) {
            if (
                pickedRouteStationLists[i + 1] &&
                pickedRouteStationLists[i + 1].stationId ===
                    pickedRouteStationLists[i].stationId
            ) {
                continue;
            }

            if (
                some(
                    pickedRouteStationLists,
                    (o, n) =>
                        i < n &&
                        o.stationId === pickedRouteStationLists[i].stationId &&
                        !o.isLowPriority,
                )
            ) {
                continue;
            }

            if (
                !!pickedRouteStationLists[i].isLowPriority &&
                some(
                    pickedRouteStationLists,
                    (o, n) =>
                        n < i &&
                        o.stationId === pickedRouteStationLists[i].stationId,
                )
            ) {
                continue;
            }

            stations.push(pickedRouteStationLists[i].station);
        }

        return { service: omit(dto, 'operatingSystems'), stations };
    }
}