import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TripBlockModel } from '../models/trip-block.model';
import { TripBlockQuery } from './trip-block.query';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyMock = jest.MockedFunction<(...args: any[]) => any>;

function buildQueryBuilderMock(getManyResult: unknown[]) {
    const qb: Record<string, AnyMock> = {};
    for (const method of [
        'select',
        'addSelect',
        'innerJoin',
        'leftJoin',
        'orderBy',
        'addOrderBy',
    ]) {
        qb[method] = jest.fn().mockReturnValue(qb);
    }
    qb.getMany = jest.fn().mockResolvedValue(getManyResult);
    return qb;
}

describe('TripBlockQuery - findManyByFilterWithFields', () => {
    let qb: Record<string, AnyMock>;
    let query: TripBlockQuery;

    beforeEach(async () => {
        qb = buildQueryBuilderMock([
            {
                id: 'b1',
                trips: [
                    {
                        id: 't1',
                        tripNumber: '7416',
                        times: [
                            { id: 'tm1', stationId: 's1', arrivalTime: null },
                        ],
                    },
                ],
            },
        ]);
        const repository = {
            createQueryBuilder: jest.fn().mockReturnValue(qb),
            metadata: {
                connection: { options: { type: 'postgres' } },
                columns: [],
                primaryColumns: [],
                relations: [],
                targetName: 'TripBlockModel',
            },
        };
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TripBlockQuery,
                {
                    provide: getRepositoryToken(TripBlockModel),
                    useValue: repository,
                },
            ],
        }).compile();
        query = module.get(TripBlockQuery);
    });

    it('指定した資源の関連だけを結合し、指定した列と主キーだけを選ぶ', async () => {
        const fieldsets = new Map([
            ['trip', new Set(['tripNumber'])],
            ['time', new Set(['stationId', 'arrivalTime'])],
        ]);

        const result = await query.findManyByFilterWithFields(
            { calendarId: 'c1', tripDirection: 0 },
            fieldsets,
        );

        expect(qb.select).toHaveBeenCalledWith(['tripBlock.id']);
        expect(qb.innerJoin).toHaveBeenCalledWith(
            'tripBlock.trips',
            'filterTrip',
            'filterTrip.calendarId = :calendarId AND filterTrip.tripDirection = :tripDirection',
            { calendarId: 'c1', tripDirection: 0 },
        );
        expect(qb.leftJoin).toHaveBeenCalledWith('tripBlock.trips', 'trips');
        expect(qb.addSelect).toHaveBeenCalledWith([
            'trips.id',
            'trips.tripNumber',
        ]);
        expect(qb.leftJoin).toHaveBeenCalledWith('trips.times', 'times');
        expect(qb.addSelect).toHaveBeenCalledWith([
            'times.id',
            'times.stationId',
            'times.arrivalTime',
        ]);
        // 指定の無い関連は結合しない
        expect(qb.leftJoin).not.toHaveBeenCalledWith(
            'trips.tripOperationLists',
            'tripOperationLists',
        );
        expect(qb.leftJoin).not.toHaveBeenCalledWith(
            'trips.tripClass',
            'tripClass',
        );
        // 時刻を結合したときは既存の口と同じ時刻順
        expect(qb.orderBy).toHaveBeenCalledWith(
            'times.departureDays',
            'ASC',
            'NULLS LAST',
        );
        expect(result).toEqual([
            {
                id: 'b1',
                trips: [
                    {
                        id: 't1',
                        tripNumber: '7416',
                        times: [{ stationId: 's1' }],
                    },
                ],
            },
        ]);
    });

    it('運用の一覧・運用・種別を指定すればそれぞれ結合する', async () => {
        const fieldsets = new Map([
            ['trip', new Set<string>()],
            ['tripOperationList', new Set(['operationId'])],
            ['operation', new Set(['operationNumber'])],
            ['tripClass', new Set(['tripClassName'])],
        ]);

        await query.findManyByFilterWithFields(
            { calendarId: 'c1', tripDirection: 1 },
            fieldsets,
        );

        expect(qb.leftJoin).toHaveBeenCalledWith(
            'trips.tripOperationLists',
            'tripOperationLists',
        );
        expect(qb.addSelect).toHaveBeenCalledWith([
            'tripOperationLists.id',
            'tripOperationLists.operationId',
        ]);
        expect(qb.leftJoin).toHaveBeenCalledWith(
            'tripOperationLists.operation',
            'operation',
        );
        expect(qb.addSelect).toHaveBeenCalledWith([
            'operation.id',
            'operation.operationNumber',
        ]);
        expect(qb.leftJoin).toHaveBeenCalledWith(
            'trips.tripClass',
            'tripClass',
        );
        expect(qb.addSelect).toHaveBeenCalledWith([
            'tripClass.id',
            'tripClass.tripClassName',
        ]);
        // 時刻を結合しないときは時刻順の並べ替えもしない
        expect(qb.orderBy).not.toHaveBeenCalled();
    });
});
