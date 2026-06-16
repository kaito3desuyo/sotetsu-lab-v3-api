import { CrudRequest, GetManyDefaultResponse } from '@dataui/crud';
import { TypeOrmCrudService } from '@dataui/crud-typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { isArray } from 'lodash';
import { Repository } from 'typeorm';
import { RouteDetailsDto } from '../../usecase/dtos/route-details.dto';
import { RouteStationsDto } from '../../usecase/dtos/route-stations.dto';
import {
    RouteDtoBuilder,
    RoutesDtoBuilder,
} from '../builders/route.dto.builder';
import { RouteStationsDtoBuilder } from '../builders/route-stations.dto.builder';
import { RouteModel } from '../models/route.model';

@Injectable()
export class RouteQuery extends TypeOrmCrudService<RouteModel> {
    constructor(
        @InjectRepository(RouteModel)
        private readonly routeRepository: Repository<RouteModel>,
    ) {
        super(routeRepository);
    }

    async findManyRoutes(
        query: CrudRequest,
    ): Promise<RouteDetailsDto[] | GetManyDefaultResponse<RouteDetailsDto>> {
        const models = await this.getMany(query);

        if (isArray(models)) {
            return RoutesDtoBuilder.buildFromModel(models);
        } else {
            const data = RoutesDtoBuilder.buildFromModel(models.data);
            return {
                ...models,
                data,
            };
        }
    }

    async findOneRoute(query: CrudRequest): Promise<RouteDetailsDto> {
        const model = await this.getOne(query);

        if (!model) {
            return null;
        }

        return RouteDtoBuilder.buildFromModel(model);
    }

    async findOneWithStations(params: {
        routeId: string;
    }): Promise<RouteStationsDto | null> {
        const { routeId } = params;

        const model = await this.routeRepository.findOne({
            where: { id: routeId },
            relations: ['routeStationLists', 'routeStationLists.station'],
        });

        if (!model) {
            return null;
        }

        return RouteStationsDtoBuilder.buildFromModel(model);
    }

    async findManyByServiceName(params?: {
        serviceName?: string;
    }): Promise<RouteDetailsDto[]> {
        const { serviceName } = params ?? {};

        let qb = this.routeRepository
            .createQueryBuilder('route')
            .select('route')
            .leftJoinAndSelect('route.routeStationLists', 'routeStationLists')
            .leftJoinAndSelect('routeStationLists.station', 'station')
            .orderBy('routeStationLists.stationSequence', 'ASC');

        if (serviceName) {
            qb = qb
                .innerJoin('route.operatingSystems', 'operatingSystem')
                .innerJoin('operatingSystem.service', 'service')
                .where('service.serviceName = :serviceName', { serviceName });
        }

        const models = await qb.getMany();
        return RoutesDtoBuilder.buildFromModel(models);
    }
}
