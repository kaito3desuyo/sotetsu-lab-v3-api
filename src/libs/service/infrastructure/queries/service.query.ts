import { CrudRequest, GetManyDefaultResponse } from '@dataui/crud';
import { TypeOrmCrudService } from '@dataui/crud-typeorm';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { isArray } from 'lodash';
import { DataSourceConfig } from 'src/core/configs/database.config';
import { AgencyModel } from 'src/libs/agency/infrastructure/models/agency.model';
import { EntityManager, Repository } from 'typeorm';
import { ServiceDetailsDto } from '../../usecase/dtos/service-details.dto';
import { ServiceRoutesDto } from '../../usecase/dtos/service-routes.dto';
import { ServiceAgenciesDtoBuilder } from '../builders/service-agencies.dto.builder';
import {
    buildServiceDetailsDto,
    ServiceDtoBuilder,
} from '../builders/service-dto.builder';
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
            return models.map((o) => buildServiceDetailsDto(o));
        } else {
            const data = models.data.map((o) => buildServiceDetailsDto(o));
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

        return buildServiceDetailsDto(model);
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

        return ServiceDtoBuilder.toRoutesDto(model);
    }
}
