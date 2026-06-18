import { CrudRequest, GetManyDefaultResponse } from '@dataui/crud';
import { TypeOrmCrudService } from '@dataui/crud-typeorm';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { cloneDeep, isArray, sortBy } from 'lodash';
import { DataSourceConfig } from 'src/core/configs/database.config';
import { AgencyModel } from 'src/libs/agency/infrastructure/models/agency.model';
import { RouteStationListModel } from 'src/libs/route/infrastructure/models/route-station-list.model';
import { StationModel } from 'src/libs/station/infrastructure/models/station.model';
import { EntityManager, Repository } from 'typeorm';
import { ServiceDetailsDto } from '../../usecase/dtos/service-details.dto';
import { ServiceRoutesDto } from '../../usecase/dtos/service-routes.dto';
import { ServiceStationsDto } from '../../usecase/dtos/service-stations.dto';
import { ServiceAgenciesDtoBuilder } from '../builders/service-agencies.dto.builder';
import { ServiceRoutesDtoBuilder } from '../builders/service-routes.dto.builder';
import { ServiceStationsDtoBuilder } from '../builders/service-stations.dto.builder';
import {
    ServiceDtoBuilder,
    ServicesDtoBuilder,
} from '../builders/service.dto.builder';
import { ServiceModel } from '../models/service.model';

@Injectable()
export class ServiceQuery extends TypeOrmCrudService<ServiceModel> {
    constructor(
        @InjectRepository(ServiceModel)
        private readonly serviceRepository: Repository<ServiceModel>,
        @InjectEntityManager(DataSourceConfig)
        private readonly entityManager: EntityManager,
    ) {
        super(serviceRepository);
    }

    async findManyServices(
        query: CrudRequest,
    ): Promise<
        ServiceDetailsDto[] | GetManyDefaultResponse<ServiceDetailsDto>
    > {
        const models = await this.getMany(query);

        if (isArray(models)) {
            return ServicesDtoBuilder.buildFromModel(models);
        } else {
            const data = ServicesDtoBuilder.buildFromModel(models.data);
            return {
                ...models,
                data,
            };
        }
    }

    async findOneService(query: CrudRequest): Promise<ServiceDetailsDto> {
        const model = await this.getOne(query);

        if (!model) {
            return null;
        }

        return ServiceDtoBuilder.buildFromModel(model);
    }

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

        const model = await this.serviceRepository.findOne({
            where: { id: serviceId },
            relations: ['operatingSystems', 'operatingSystems.route'],
        });

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
        const { serviceId } = params;

        const service = await this.serviceRepository
            .createQueryBuilder('service')
            .leftJoinAndSelect('service.operatingSystems', 'operatingSystems')
            .leftJoinAndSelect('operatingSystems.route', 'route')
            .leftJoinAndSelect('route.routeStationLists', 'routeStationLists')
            .leftJoinAndSelect('routeStationLists.station', 'station')
            .leftJoinAndSelect(
                'station.routeStationLists',
                'stationRouteStationLists',
            )
            .leftJoinAndSelect('stationRouteStationLists.route', 'stationRoute')
            .leftJoinAndSelect('station.stops', 'stops')
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
            .addOrderBy('routeStationLists.stationSequence', 'ASC')
            .getOne();

        if (!service) return null;

        const pickedRouteStationLists: (RouteStationListModel & {
            priority?: number;
        })[] = [];

        for (const operatingSystem of service.operatingSystems) {
            const isAscending =
                operatingSystem.startRouteStationList.stationSequence <
                operatingSystem.endRouteStationList.stationSequence;

            const sortedRSLs = isAscending
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

            const startIdx = sortedRSLs.findIndex(
                (o) =>
                    o.stationId ===
                    operatingSystem.startRouteStationList.stationId,
            );
            const endIdx = sortedRSLs.findIndex(
                (o) =>
                    o.stationId ===
                    operatingSystem.endRouteStationList.stationId,
            );

            for (const rsl of sortedRSLs.filter(
                (_, i) => startIdx <= i && i <= endIdx,
            )) {
                if (
                    ['厚木線', '副都心線', '有楽町線'].includes(
                        operatingSystem.route.routeName,
                    )
                ) {
                    pickedRouteStationLists.push({ ...rsl, priority: 1 });
                    position = pickedRouteStationLists.length - 1;
                } else if (operatingSystem.route.routeName === '西武有楽町線') {
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

        return ServiceStationsDtoBuilder.buildFromModel({ service, stations });
    }
}
