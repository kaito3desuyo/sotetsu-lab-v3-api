import { UnexpectedError } from '../../../../core/classes/unexpected-error.js';
import { Test, TestingModule } from '@nestjs/testing';
import { getEntityManagerToken, getRepositoryToken } from '@nestjs/typeorm';
import { DataSourceConfig } from '../../../../core/configs/database.config.js';
import { parseSelection } from '../../../../core/utils/selection/parse-selection.js';
import { SERVICE_STATIONS_SELECTION_TREE } from '../../usecase/service-stations-selection.js';
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

describe('ServiceQuery.findOneStationsForService の結合漏れ', () => {
    it('運行系統の始点（startRouteStationList）が結合できなければ UnexpectedError', async () => {
        const query = await buildQuery({
            id: 'svc',
            operatingSystems: [
                {
                    ...service.operatingSystems[0],
                    startRouteStationList: undefined,
                },
            ],
        });

        await expect(
            query.findOneStationsForService({ serviceId: 'svc' }),
        ).rejects.toThrow(UnexpectedError);
    });
});

async function buildQueryWithChain(
    result: unknown,
): Promise<{ query: ServiceQuery; qb: Record<string, ReturnType<typeof vi.fn>> }> {
    const qb = chain(result) as Record<string, ReturnType<typeof vi.fn>>;
    const module: TestingModule = await Test.createTestingModule({
        providers: [
            ServiceQuery,
            {
                provide: getRepositoryToken(ServiceModel),
                useValue: { createQueryBuilder: () => qb },
            },
            { provide: getEntityManagerToken(DataSourceConfig), useValue: {} },
        ],
    }).compile();
    return { query: module.get(ServiceQuery), qb };
}

describe('ServiceQuery.findOneStationsForServiceWithSelection', () => {
    const select = (raw: { include?: unknown; fields?: unknown }) =>
        parseSelection(raw, SERVICE_STATIONS_SELECTION_TREE)!;

    it('空の include: 駅だけを全部入りと同じ並びで返し、service のキーも駅の関連の結合も無い', async () => {
        const { query, qb } = await buildQueryWithChain(service);

        const result = await query.findOneStationsForServiceWithSelection(
            { serviceId: 'svc' },
            select({ include: '' }),
        );

        expect(result).toEqual({
            stations: [
                { id: 'A', stationName: 'A' },
                { id: 'B', stationName: 'B' },
                { id: 'D', stationName: 'D' },
                { id: 'C', stationName: 'C' },
            ],
        });
        // 並びの計算に要る結合は常にする
        expect(qb.leftJoinAndSelect).toHaveBeenCalledWith(
            'operatingSystems.startRouteStationList',
            'startRSL',
        );
        expect(qb.leftJoinAndSelect).not.toHaveBeenCalledWith(
            'station.routeStationLists',
            'stationRouteStationLists',
        );
        expect(qb.leftJoinAndSelect).not.toHaveBeenCalledWith(
            'station.stops',
            'stops',
        );
    });

    it('駅の路線とのりばを挙げればそれぞれ結合する', async () => {
        const { query, qb } = await buildQueryWithChain(service);

        await query.findOneStationsForServiceWithSelection(
            { serviceId: 'svc' },
            select({ include: 'stations.routeStationLists.route,stations.stops' }),
        );

        expect(qb.leftJoinAndSelect).toHaveBeenCalledWith(
            'station.routeStationLists',
            'stationRouteStationLists',
        );
        expect(qb.leftJoinAndSelect).toHaveBeenCalledWith(
            'stationRouteStationLists.route',
            'stationRoute',
        );
        expect(qb.leftJoinAndSelect).toHaveBeenCalledWith(
            'station.stops',
            'stops',
        );
    });

    it('service を挙げれば、指定の列で返す', async () => {
        const { query } = await buildQueryWithChain(service);

        const result = await query.findOneStationsForServiceWithSelection(
            { serviceId: 'svc' },
            select({
                include: 'service',
                fields: { service: 'serviceName', station: '' },
            }),
        );

        expect(result).toEqual({
            service: { id: 'svc' },
            stations: [{ id: 'A' }, { id: 'B' }, { id: 'D' }, { id: 'C' }],
        });
    });

    it('運行系統が見つからなければ null', async () => {
        const { query } = await buildQueryWithChain(null);
        await expect(
            query.findOneStationsForServiceWithSelection(
                { serviceId: 'none' },
                select({ include: '' }),
            ),
        ).resolves.toBeNull();
    });
});

describe('ServiceQuery.findOneWithAgencies', () => {
    async function buildQueryWithManager(serviceResult: unknown) {
        const getRepository = vi.fn().mockReturnValue({
            createQueryBuilder: () => {
                const qb = chain(serviceResult);
                qb.select = vi.fn().mockReturnValue(qb);
                return qb;
            },
        });
        const entityManager = {
            transaction: vi.fn(
                async (run: (manager: unknown) => Promise<unknown>) =>
                    run({ getRepository }),
            ),
        };
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ServiceQuery,
                { provide: getRepositoryToken(ServiceModel), useValue: {} },
                {
                    provide: getEntityManagerToken(DataSourceConfig),
                    useValue: entityManager,
                },
            ],
        }).compile();
        return { query: module.get(ServiceQuery), getRepository };
    }

    it('運行系統が見つからなければ事業者を引かずに null', async () => {
        const { query, getRepository } = await buildQueryWithManager(null);

        await expect(
            query.findOneWithAgencies({ serviceId: 'none' }),
        ).resolves.toBeNull();
        // 運行系統の取得の 1 回だけで、事業者の取得（AgencyModel）には進まない
        expect(getRepository).toHaveBeenCalledTimes(1);
        expect(getRepository).toHaveBeenCalledWith(ServiceModel);
    });
});
