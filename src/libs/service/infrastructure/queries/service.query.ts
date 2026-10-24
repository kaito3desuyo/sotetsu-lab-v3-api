import { Injectable } from '@nestjs/common';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { UnexpectedError } from '../../../../core/classes/unexpected-error.js';
import { DataSourceConfig } from '../../../../core/configs/database.config.js';
import { AgencyModel } from '../../../agency/infrastructure/models/agency.model.js';
import { RouteStationListModel } from '../../../route/infrastructure/models/route-station-list.model.js';
import { StationModel } from '../../../station/infrastructure/models/station.model.js';
import type { Selection } from '../../../../core/utils/selection/parse-selection.js';
import { serializeSelection } from '../../../../core/utils/selection/serialize-selection.js';
import { EntityManager, Repository } from 'typeorm';
import { ServiceDetailsDto } from '../../usecase/dtos/service-details.dto.js';
import { ServiceRoutesDto } from '../../usecase/dtos/service-routes.dto.js';
import { ServiceStationsDto } from '../../usecase/dtos/service-stations.dto.js';
import { SERVICE_STATIONS_SELECTION_TREE } from '../../usecase/service-stations-selection.js';
import { ServiceAgenciesDtoBuilder } from '../builders/service-agencies.dto.builder.js';
import { ServiceRoutesDtoBuilder } from '../builders/service-routes.dto.builder.js';
import { ServiceStationsDtoBuilder } from '../builders/service-stations.dto.builder.js';
import {
    ServicesDtoBuilder,
} from '../builders/service.dto.builder.js';
import { ServiceModel } from '../models/service.model.js';

@Injectable()
export class ServiceQuery {
    constructor(
        @InjectRepository(ServiceModel)
        private readonly serviceRepository: Repository<ServiceModel>,
        @InjectEntityManager(DataSourceConfig)
        private readonly entityManager: EntityManager,
    ) {}

    async findOneWithAgencies(params: { serviceId: string }): Promise<any> {
        const { serviceId } = params;

        const model = await this.entityManager.transaction(
            async (transactionalEntityManager) => {
                const service = await transactionalEntityManager
                    .getRepository(ServiceModel)
                    .createQueryBuilder('service')
                    .select('service')
                    .where('service.id = :serviceId', { serviceId })
                    .getOne();

                const agencies = await transactionalEntityManager
                    .getRepository(AgencyModel)
                    .createQueryBuilder('agency')
                    .select('agency')
                    .distinct(true)
                    .addSelect(
                        'substring(agency.agency_number from 2 for 12)',
                        'agency_number_sort_key',
                    )
                    .leftJoin('agency.routes', 'route')
                    .leftJoin('route.operatingSystems', 'operatingSystem')
                    .leftJoin('operatingSystem.service', 'service')
                    .where('service.id = :serviceId', { serviceId })
                    .orderBy('agency_number_sort_key', 'ASC')
                    .addOrderBy('agency.agency_number', 'ASC')
                    .getMany();

                return {
                    service,
                    agencies,
                };
            },
        );

        return ServiceAgenciesDtoBuilder.buildFromModel(model);
    }

    async findOneWithRoutes(params: {
        serviceId: string;
    }): Promise<ServiceRoutesDto | null> {
        const { serviceId } = params;

        const model = await this.serviceRepository
            .createQueryBuilder('service')
            .select('service')
            .leftJoinAndSelect('service.operatingSystems', 'operatingSystems')
            .leftJoinAndSelect('operatingSystems.route', 'route')
            .where('service.id = :serviceId', { serviceId })
            .getOne();

        if (!model) {
            return null;
        }

        return ServiceRoutesDtoBuilder.buildFromModel(model);
    }

    async findManyByServiceName(params?: {
        serviceName?: string;
    }): Promise<ServiceDetailsDto[]> {
        const { serviceName } = params ?? {};

        let qb = this.serviceRepository
            .createQueryBuilder('service')
            .select('service');

        if (serviceName) {
            qb = qb.where('service.serviceName = :serviceName', { serviceName });
        }

        const models = await qb.getMany();
        return ServicesDtoBuilder.buildFromModel(models);
    }

    async findOneStationsForService(params: {
        serviceId: string;
    }): Promise<ServiceStationsDto | null> {
        const service = await this.#stationsForServiceQuery(params.serviceId)
            .leftJoinAndSelect(
                'station.routeStationLists',
                'stationRouteStationLists',
            )
            .leftJoinAndSelect('stationRouteStationLists.route', 'stationRoute')
            .leftJoinAndSelect('station.stops', 'stops')
            .getOne();

        if (!service) return null;

        const stations = this.#pickStations(service);
        return ServiceStationsDtoBuilder.buildFromModel({ service, stations });
    }

    /**
     * `findOneStationsForService` と同じ並びで、`include`・`fields` で選んだ関連・列だけを返す
     * （docs/adr/0010-v3-include-and-fields.md）。並びの計算に要る結合は常にする。
     */
    async findOneStationsForServiceWithSelection(
        params: { serviceId: string },
        selection: Selection,
    ): Promise<Record<string, unknown> | null> {
        const qb = this.#stationsForServiceQuery(params.serviceId);
        if (selection.paths.has('stations.routeStationLists')) {
            qb.leftJoinAndSelect(
                'station.routeStationLists',
                'stationRouteStationLists',
            );
        }
        if (selection.paths.has('stations.routeStationLists.route')) {
            qb.leftJoinAndSelect(
                'stationRouteStationLists.route',
                'stationRoute',
            );
        }
        if (selection.paths.has('stations.stops')) {
            qb.leftJoinAndSelect('station.stops', 'stops');
        }

        const service = await qb.getOne();
        if (!service) return null;

        const stations = this.#pickStations(service);
        return serializeSelection(
            { service, stations },
            SERVICE_STATIONS_SELECTION_TREE,
            selection,
        );
    }

    /** 駅の並びの計算に要る結合（運行系統・路線・路線の駅・始終点） */
    #stationsForServiceQuery(serviceId: string) {
        return this.serviceRepository
            .createQueryBuilder('service')
            .leftJoinAndSelect('service.operatingSystems', 'operatingSystems')
            .leftJoinAndSelect('operatingSystems.route', 'route')
            .leftJoinAndSelect('route.routeStationLists', 'routeStationLists')
            .leftJoinAndSelect('routeStationLists.station', 'station')
            .leftJoinAndSelect(
                'operatingSystems.startRouteStationList',
                'startRSL',
            )
            .leftJoinAndSelect(
                'operatingSystems.endRouteStationList',
                'endRSL',
            )
            .where('service.id = :serviceId', { serviceId })
            .orderBy('operatingSystems.sequence', 'ASC')
            .addOrderBy('routeStationLists.stationSequence', 'ASC');
    }

    #pickStations(service: ServiceModel): StationModel[] {
        const pickedRouteStationLists: (RouteStationListModel & {
            priority?: number;
        })[] = [];

        // leftJoinAndSelect しているので、運行系統が無くても空の配列が入る
        for (const operatingSystem of service.operatingSystems!) {
            const { route, startRouteStationList, endRouteStationList } =
                operatingSystem;
            if (
                !route?.routeStationLists ||
                !startRouteStationList ||
                !endRouteStationList
            ) {
                throw new UnexpectedError(
                    '運行系統の路線か始終点が結合できない',
                    { operatingSystemId: operatingSystem.id },
                );
            }

            const isAscending =
                startRouteStationList.stationSequence <
                endRouteStationList.stationSequence;

            const byStationSequence =
                route.routeStationLists.toSorted(
                    (a, b) => a.stationSequence - b.stationSequence,
                );
            const sortedRSLs = isAscending
                ? byStationSequence
                : byStationSequence.toReversed();

            const initialPosition = pickedRouteStationLists
                .toReversed()
                .findIndex(
                    (o) =>
                        o.stationId ===
                        startRouteStationList.stationId,
                );

            let position =
                initialPosition !== -1
                    ? pickedRouteStationLists.length - 1 - initialPosition
                    : pickedRouteStationLists.length - 1;

            const startIdx = sortedRSLs.findIndex(
                (o) =>
                    o.stationId ===
                    startRouteStationList.stationId,
            );
            const endIdx = sortedRSLs.findIndex(
                (o) =>
                    o.stationId ===
                    endRouteStationList.stationId,
            );

            for (const rsl of sortedRSLs.filter(
                (_, i) => startIdx <= i && i <= endIdx,
            )) {
                if (
                    ['厚木線', '副都心線', '有楽町線'].includes(
                        route.routeName,
                    )
                ) {
                    pickedRouteStationLists.push({ ...rsl, priority: 1 });
                    position = pickedRouteStationLists.length - 1;
                } else if (route.routeName === '西武有楽町線') {
                    pickedRouteStationLists.push({ ...rsl, priority: 2 });
                    position = pickedRouteStationLists.length - 1;
                } else {
                    pickedRouteStationLists.splice(position + 1, 0, {
                        ...rsl,
                        priority: 0,
                    });
                    position++;
                }

                if (
                    operatingSystem.startRouteStationListId !== rsl.id &&
                    operatingSystem.endRouteStationListId !== rsl.id &&
                    pickedRouteStationLists.some(
                        (o) =>
                            o.id !== rsl.id && o.stationId === rsl.stationId,
                    )
                ) {
                    position++;
                }
            }
        }

        const stations: StationModel[] = [];
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
                        (o.priority ?? 0) <= 0,
                )
            ) {
                continue;
            }

            if (
                (pickedRouteStationLists[i].priority ?? 0) >= 2 &&
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
                (pickedRouteStationLists[i].priority ?? 0) >= 1 &&
                pickedRouteStationLists.some(
                    (o, n) =>
                        n < i &&
                        o.id !== pickedRouteStationLists[i].id &&
                        o.stationId === pickedRouteStationLists[i].stationId &&
                        (o.priority ?? 0) <= 1,
                )
            ) {
                continue;
            }

            stations.push(pickedRouteStationLists[i].station);
        }

        return stations;
    }
}
