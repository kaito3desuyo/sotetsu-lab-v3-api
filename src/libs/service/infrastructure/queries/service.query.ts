import { CrudRequest, GetManyDefaultResponse } from '@dataui/crud';
import { TypeOrmCrudService } from '@dataui/crud-typeorm';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { isArray } from 'lodash';
import { DataSourceConfig } from 'src/core/configs/database.config';
import { AgencyModel } from 'src/libs/agency/infrastructure/models/agency.model';
import { RouteStationListModel } from 'src/libs/route/infrastructure/models/route-station-list.model';
import { StationsDtoBuilder } from 'src/libs/station/infrastructure/builders/station.dto.builder';
import { StationModel } from 'src/libs/station/infrastructure/models/station.model';
import { StationDetailsDto } from 'src/libs/station/usecase/dtos/station-details.dto';
import { EntityManager, Repository } from 'typeorm';
import { ServiceDetailsDto } from '../../usecase/dtos/service-details.dto';
import { ServiceRoutesDto } from '../../usecase/dtos/service-routes.dto';
import { ServiceAgenciesDtoBuilder } from '../builders/service-agencies.dto.builder';
import { ServiceRoutesDtoBuilder } from '../builders/service-routes.dto.builder';
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
    }): Promise<StationDetailsDto[]> {
        const { serviceId } = params;

        const models = await this.entityManager
            .getRepository(StationModel)
            .createQueryBuilder('station')
            .leftJoinAndSelect('station.routeStationLists', 'routeStationLists')
            .leftJoinAndSelect('routeStationLists.route', 'route')
            .leftJoinAndSelect('station.stops', 'stops')
            .where((qb) => {
                const subQuery = qb
                    .subQuery()
                    .select('rsl2.stationId')
                    .from(RouteStationListModel, 'rsl2')
                    .innerJoin('rsl2.route', 'route2')
                    .innerJoin('route2.operatingSystems', 'os2')
                    .where('os2.serviceId = :serviceId')
                    .getQuery();
                return `station.id IN ${subQuery}`;
            })
            .setParameter('serviceId', serviceId)
            .getMany();

        return StationsDtoBuilder.buildFromModel(models);
    }
}
