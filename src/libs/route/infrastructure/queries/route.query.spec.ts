import type { MockedFunction } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { parseSelection } from '../../../../core/utils/selection/parse-selection.js';
import { ROUTES_SELECTION_TREE } from '../../usecase/route-selection.js';
import { RouteModel } from '../models/route.model.js';
import { RouteQuery } from './route.query.js';

type AnyMock = MockedFunction<(...args: any[]) => any>;

describe('RouteQuery - findManyByServiceNameWithSelection', () => {
    let qb: Record<string, AnyMock>;
    let query: RouteQuery;

    const select = (raw: { include?: unknown; fields?: unknown }) =>
        parseSelection(raw, ROUTES_SELECTION_TREE)!;

    beforeEach(async () => {
        qb = {};
        for (const method of [
            'select',
            'addSelect',
            'leftJoin',
            'innerJoin',
            'where',
            'orderBy',
        ]) {
            qb[method] = vi.fn().mockReturnValue(qb);
        }
        qb.getMany = vi.fn().mockResolvedValue([
            {
                id: 'r1',
                routeName: '本線',
                routeColor: null,
                routeStationLists: [
                    {
                        id: 'rsl1',
                        stationSequence: 1,
                        station: { id: 'st1', stationName: '横浜' },
                    },
                ],
            },
        ]);
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RouteQuery,
                {
                    provide: getRepositoryToken(RouteModel),
                    useValue: { createQueryBuilder: () => qb },
                },
            ],
        }).compile();
        query = module.get(RouteQuery);
    });

    it('include= なら路線の列だけを選び、結合も並べ替えもしない', async () => {
        const result = await query.findManyByServiceNameWithSelection(
            {},
            select({ include: '', fields: { route: 'routeName,routeColor' } }),
        );

        expect(qb.select).toHaveBeenCalledWith([
            'route.id',
            'route.routeName',
            'route.routeColor',
        ]);
        expect(qb.leftJoin).not.toHaveBeenCalled();
        expect(qb.orderBy).not.toHaveBeenCalled();
        expect(result).toEqual([{ id: 'r1', routeName: '本線' }]);
    });

    it('include=routeStationLists.station なら路線の駅と駅を結合し、駅の並びで並べる', async () => {
        const result = await query.findManyByServiceNameWithSelection(
            {},
            select({
                include: 'routeStationLists.station',
                fields: {
                    route: 'routeName',
                    routeStationList: 'stationSequence',
                    station: 'stationName',
                },
            }),
        );

        expect(qb.leftJoin).toHaveBeenCalledWith(
            'route.routeStationLists',
            'routeStationLists',
        );
        expect(qb.leftJoin).toHaveBeenCalledWith(
            'routeStationLists.station',
            'station',
        );
        expect(qb.addSelect).toHaveBeenCalledWith([
            'routeStationLists.id',
            'routeStationLists.stationSequence',
        ]);
        expect(qb.addSelect).toHaveBeenCalledWith([
            'station.id',
            'station.stationName',
        ]);
        expect(qb.orderBy).toHaveBeenCalledWith(
            'routeStationLists.stationSequence',
            'ASC',
        );
        expect(result).toEqual([
            {
                id: 'r1',
                routeName: '本線',
                routeStationLists: [
                    {
                        id: 'rsl1',
                        stationSequence: 1,
                        station: { id: 'st1', stationName: '横浜' },
                    },
                ],
            },
        ]);
    });

    it('serviceName があれば運行系統で絞る結合をする', async () => {
        await query.findManyByServiceNameWithSelection(
            { serviceName: '相鉄線' },
            select({ include: '' }),
        );

        expect(qb.innerJoin).toHaveBeenCalledWith(
            'route.operatingSystems',
            'operatingSystem',
        );
        expect(qb.innerJoin).toHaveBeenCalledWith(
            'operatingSystem.service',
            'service',
        );
        expect(qb.where).toHaveBeenCalledWith(
            'service.serviceName = :serviceName',
            { serviceName: '相鉄線' },
        );
    });
});
