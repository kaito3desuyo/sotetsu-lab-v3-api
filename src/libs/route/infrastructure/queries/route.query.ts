import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RouteDetailsDto } from '../../usecase/dtos/route-details.dto.js';
import { RouteStationsDto } from '../../usecase/dtos/route-stations.dto.js';
import { RoutesDtoBuilder } from '../builders/route.dto.builder.js';
import { RouteStationsDtoBuilder } from '../builders/route-stations.dto.builder.js';
import { RouteModel } from '../models/route.model.js';

@Injectable()
export class RouteQuery {
    constructor(
        @InjectRepository(RouteModel)
        private readonly routeRepository: Repository<RouteModel>,
    ) {}

    async findOneWithStations(params: {
        routeId: string;
    }): Promise<RouteStationsDto | null> {
        const { routeId } = params;

        const model = await this.routeRepository
            .createQueryBuilder('route')
            .select('route')
            .leftJoinAndSelect('route.routeStationLists', 'routeStationLists')
            .leftJoinAndSelect('routeStationLists.station', 'station')
            .where('route.id = :routeId', { routeId })
            .getOne();

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
