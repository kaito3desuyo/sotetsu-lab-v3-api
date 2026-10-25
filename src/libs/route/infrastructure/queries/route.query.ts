import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Selection } from '../../../../core/utils/selection/parse-selection.js';
import { selectColumns } from '../../../../core/utils/selection/select-columns.js';
import { serializeSelection } from '../../../../core/utils/selection/serialize-selection.js';
import { ROUTES_SELECTION_TREE } from '../../usecase/route-selection.js';
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

    /**
     * `findManyByServiceName` と同じ条件で、`include`・`fields` で選んだ関連・列だけを返す
     * （docs/adr/0010-v3-include-and-fields.md）。駅の並びは路線の駅を結合するときだけ。
     */
    async findManyByServiceNameWithSelection(
        params: { serviceName?: string },
        selection: Selection,
    ): Promise<Record<string, unknown>[]> {
        const { serviceName } = params;
        const tree = ROUTES_SELECTION_TREE;
        const routeStationLists = tree.relations.routeStationLists;

        const qb = this.routeRepository
            .createQueryBuilder('route')
            .select(selectColumns('route', tree, selection));

        if (selection.paths.has('routeStationLists')) {
            qb.leftJoin('route.routeStationLists', 'routeStationLists')
                .addSelect(
                    selectColumns(
                        'routeStationLists',
                        routeStationLists,
                        selection,
                    ),
                )
                .orderBy('routeStationLists.stationSequence', 'ASC');
        }
        if (selection.paths.has('routeStationLists.station')) {
            qb.leftJoin('routeStationLists.station', 'station').addSelect(
                selectColumns(
                    'station',
                    routeStationLists.relations.station,
                    selection,
                ),
            );
        }
        if (serviceName) {
            qb.innerJoin('route.operatingSystems', 'operatingSystem')
                .innerJoin('operatingSystem.service', 'service')
                .where('service.serviceName = :serviceName', { serviceName });
        }

        const models = await qb.getMany();
        return models.map((model) =>
            serializeSelection(model, tree, selection),
        );
    }
}
