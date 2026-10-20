import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RouteDetailsDto } from '../../usecase/dtos/route-details.dto';
import { RouteStationsDto } from '../../usecase/dtos/route-stations.dto';
import { RoutesDtoBuilder } from '../builders/route.dto.builder';
import { RouteStationsDtoBuilder } from '../builders/route-stations.dto.builder';
import { RouteModel } from '../models/route.model';

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
