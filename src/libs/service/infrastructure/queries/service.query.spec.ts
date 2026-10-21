import { Test, TestingModule } from '@nestjs/testing';
import { getEntityManagerToken, getRepositoryToken } from '@nestjs/typeorm';
import { DataSourceConfig } from '../../../../core/configs/database.config.js';
import { ServiceStationsDtoBuilder } from '../builders/service-stations.dto.builder.js';
import { ServiceModel } from '../models/service.model.js';
import { ServiceQuery } from './service.query.js';

const station = (id: string) => ({ id, stationName: id });
const rsl = (id: string, stationId: string, stationSequence: number) => ({
    id,
    stationId,
    stationSequence,
    station: station(stationId),
});

// 本線（昇り順 A→C、並びを崩して渡す）と支線（降り順 B→D）
const mainRsls = [rsl('m3', 'C', 3), rsl('m1', 'A', 1), rsl('m2', 'B', 2)];
const branchRsls = [rsl('b1', 'D', 1), rsl('b2', 'B', 2)];
const service = {
    id: 'svc',
    operatingSystems: [
        {
            route: { routeName: '本線', routeStationLists: mainRsls },
            startRouteStationList: mainRsls[1],
            endRouteStationList: mainRsls[0],
            startRouteStationListId: 'm1',
            endRouteStationListId: 'm3',
        },
        {
            route: { routeName: '支線', routeStationLists: branchRsls },
            startRouteStationList: branchRsls[1],
            endRouteStationList: branchRsls[0],
            startRouteStationListId: 'b2',
            endRouteStationListId: 'b1',
        },
    ],
};

function chain(result: unknown) {
    const qb: Record<string, unknown> = {};
    for (const m of ['leftJoinAndSelect', 'where', 'orderBy', 'addOrderBy']) {
        qb[m] = vi.fn().mockReturnValue(qb);
    }
    qb.getOne = vi.fn().mockResolvedValue(result);
    return qb;
}

async function buildQuery(result: unknown): Promise<ServiceQuery> {
    const module: TestingModule = await Test.createTestingModule({
        providers: [
            ServiceQuery,
            {
                provide: getRepositoryToken(ServiceModel),
                useValue: { createQueryBuilder: () => chain(result) },
            },
            { provide: getEntityManagerToken(DataSourceConfig), useValue: {} },
        ],
    }).compile();
    return module.get(ServiceQuery);
}

describe('ServiceQuery.findOneStationsForService', () => {
    afterEach(() => vi.restoreAllMocks());

    it('運行系統ごとに駅を並べ、支線は分岐駅の後ろに差し込む', async () => {
        const spy = vi.spyOn(ServiceStationsDtoBuilder, 'buildFromModel');
        const query = await buildQuery(service);

        await query.findOneStationsForService({ serviceId: 'svc' });

        const { stations } = spy.mock.calls[0][0];
        expect(stations.map((s) => s.id)).toEqual(['A', 'B', 'D', 'C']);
    });

    it('元の駅の並び（routeStationLists）を書き換えない', async () => {
        vi.spyOn(ServiceStationsDtoBuilder, 'buildFromModel');
        const query = await buildQuery(service);

        await query.findOneStationsForService({ serviceId: 'svc' });

        expect(mainRsls.map((r) => r.id)).toEqual(['m3', 'm1', 'm2']);
        expect(branchRsls.map((r) => r.id)).toEqual(['b1', 'b2']);
    });

    it('運行系統が見つからなければ null', async () => {
        const query = await buildQuery(null);
        await expect(
            query.findOneStationsForService({ serviceId: 'none' }),
        ).resolves.toBeNull();
    });
});
