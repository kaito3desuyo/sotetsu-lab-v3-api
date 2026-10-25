import type { MockedFunction } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { parseSelection } from '../../../../core/utils/selection/parse-selection.js';
import { TRIP_BLOCK_SELECTION_TREE } from '../../usecase/trip-block-selection.js';
import { TripBlockModel } from '../models/trip-block.model.js';
import { TripBlockQuery } from './trip-block.query.js';

type AnyMock = MockedFunction<(...args: any[]) => any>;

function buildQueryBuilderMock(getManyResult: unknown[]) {
    const qb: Record<string, AnyMock> = {};
    for (const method of [
        'select',
        'addSelect',
        'innerJoin',
        'leftJoin',
        'orderBy',
        'addOrderBy',
        'where',
    ]) {
        qb[method] = vi.fn().mockReturnValue(qb);
    }
    qb.getMany = vi.fn().mockResolvedValue(getManyResult);
    qb.getOne = vi.fn().mockResolvedValue(getManyResult[0] ?? null);
    return qb;
}

describe('TripBlockQuery - findManyByFilterWithSelection', () => {
    let qb: Record<string, AnyMock>;
    let query: TripBlockQuery;

    const select = (raw: { include?: unknown; fields?: unknown }) =>
        parseSelection(raw, TRIP_BLOCK_SELECTION_TREE)!;

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
            createQueryBuilder: vi.fn().mockReturnValue(qb),
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

    it('fields だけ: 指定した資源の関連だけを結合し、指定した列と主キーだけを選ぶ', async () => {
        const result = await query.findManyByFilterWithSelection(
            { calendarId: 'c1', tripDirection: 0 },
            select({
                fields: { trip: 'tripNumber', time: 'stationId,arrivalTime' },
            }),
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
        expect(qb.leftJoin).not.toHaveBeenCalledWith(
            'trips.tripOperationLists',
            'tripOperationLists',
        );
        expect(qb.leftJoin).not.toHaveBeenCalledWith(
            'trips.tripClass',
            'tripClass',
        );
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

    it('fields だけ: 運用の一覧・運用・種別を指定すればそれぞれ結合する', async () => {
        await query.findManyByFilterWithSelection(
            { calendarId: 'c1', tripDirection: 1 },
            select({
                fields: {
                    trip: '',
                    tripOperationList: 'operationId',
                    operation: 'operationNumber',
                    tripClass: 'tripClassName',
                },
            }),
        );

        expect(qb.addSelect).toHaveBeenCalledWith(['trips.id']);
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
        expect(qb.orderBy).not.toHaveBeenCalled();
    });

    it('空の include: 列車は全列で返し、ほかの関連は結合しない', async () => {
        await query.findManyByFilterWithSelection(
            { calendarId: 'c1', tripDirection: 0 },
            select({ include: '' }),
        );

        expect(qb.addSelect).toHaveBeenCalledWith([
            'trips.id',
            'trips.serviceId',
            'trips.tripNumber',
            'trips.tripClassId',
            'trips.tripName',
            'trips.tripDirection',
            'trips.tripBlockId',
            'trips.depotIn',
            'trips.depotOut',
            'trips.calendarId',
            'trips.extraCalendarId',
            'trips.createdAt',
            'trips.updatedAt',
        ]);
        expect(qb.leftJoin).toHaveBeenCalledTimes(1);
        expect(qb.orderBy).not.toHaveBeenCalled();
    });

    it('include で運用を挙げれば、運用の一覧も結合する', async () => {
        await query.findManyByFilterWithSelection(
            { calendarId: 'c1', tripDirection: 0 },
            select({
                include: 'trips.tripOperationLists.operation',
                fields: { operation: 'operationNumber' },
            }),
        );

        expect(qb.leftJoin).toHaveBeenCalledWith(
            'trips.tripOperationLists',
            'tripOperationLists',
        );
        expect(qb.leftJoin).toHaveBeenCalledWith(
            'tripOperationLists.operation',
            'operation',
        );
        expect(qb.addSelect).toHaveBeenCalledWith([
            'operation.id',
            'operation.operationNumber',
        ]);
    });
});

describe('TripBlockQuery - findOneByIdWithSelection', () => {
    let qb: Record<string, AnyMock>;
    let query: TripBlockQuery;

    const select = (raw: { include?: unknown; fields?: unknown }) =>
        parseSelection(raw, TRIP_BLOCK_SELECTION_TREE)!;

    beforeEach(async () => {
        qb = buildQueryBuilderMock([
            {
                id: 'b1',
                trips: [
                    {
                        id: 't1',
                        tripNumber: '1001',
                        times: [{ id: 'tm1', departureTime: '05:00:00' }],
                        tripClass: { id: 'k1', tripClassName: '各停' },
                    },
                ],
            },
        ]);
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TripBlockQuery,
                {
                    provide: getRepositoryToken(TripBlockModel),
                    useValue: { createQueryBuilder: () => qb },
                },
            ],
        }).compile();
        query = module.get(TripBlockQuery);
    });

    it('id で絞り、列車だけなら時刻を結合も並べ替えもしない', async () => {
        const result = await query.findOneByIdWithSelection(
            { id: 'b1' },
            select({ include: '', fields: { trip: 'tripNumber' } }),
        );

        expect(qb.where).toHaveBeenCalledWith('tripBlock.id = :id', {
            id: 'b1',
        });
        expect(qb.innerJoin).not.toHaveBeenCalled();
        expect(qb.leftJoin).toHaveBeenCalledWith('tripBlock.trips', 'trips');
        expect(qb.leftJoin).not.toHaveBeenCalledWith('trips.times', 'times');
        expect(qb.orderBy).not.toHaveBeenCalled();
        expect(result).toEqual({
            id: 'b1',
            trips: [{ id: 't1', tripNumber: '1001' }],
        });
    });

    it('include=trips.times,trips.tripClass なら結合し、時刻で並べる', async () => {
        const result = await query.findOneByIdWithSelection(
            { id: 'b1' },
            select({
                include: 'trips.times,trips.tripClass',
                fields: {
                    trip: 'tripNumber',
                    time: 'departureTime',
                    tripClass: 'tripClassName',
                },
            }),
        );

        expect(qb.leftJoin).toHaveBeenCalledWith('trips.times', 'times');
        expect(qb.leftJoin).toHaveBeenCalledWith(
            'trips.tripClass',
            'tripClass',
        );
        expect(qb.orderBy).toHaveBeenCalledWith(
            'times.departureDays',
            'ASC',
            'NULLS LAST',
        );
        expect(result).toEqual({
            id: 'b1',
            trips: [
                {
                    id: 't1',
                    tripNumber: '1001',
                    times: [{ departureTime: '05:00:00' }],
                    tripClass: { tripClassName: '各停' },
                },
            ],
        });
    });

    it('見つからなければ null', async () => {
        qb.getOne.mockResolvedValue(null);
        await expect(
            query.findOneByIdWithSelection(
                { id: 'x' },
                select({ include: '' }),
            ),
        ).resolves.toBeNull();
    });
});

describe('TripBlockQuery - findOneTripBlockByTripId', () => {
    let qb: Record<string, AnyMock>;
    let query: TripBlockQuery;

    beforeEach(async () => {
        qb = {};
        for (const method of [
            'select',
            'innerJoin',
            'leftJoinAndSelect',
            'where',
        ]) {
            qb[method] = vi.fn().mockReturnValue(qb);
        }
        qb.getOne = vi.fn().mockResolvedValue(null);
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TripBlockQuery,
                {
                    provide: getRepositoryToken(TripBlockModel),
                    useValue: {
                        createQueryBuilder: vi.fn().mockReturnValue(qb),
                    },
                },
            ],
        }).compile();
        query = module.get(TripBlockQuery);
    });

    it('列車での絞り込みは別名の結合で行い、block の列車は全部読み込む', async () => {
        await query.findOneTripBlockByTripId('t1');

        expect(qb.innerJoin).toHaveBeenCalledWith(
            'tripBlock.trips',
            'filterTrip',
            'filterTrip.id = :tripId',
            { tripId: 't1' },
        );
        expect(qb.leftJoinAndSelect).toHaveBeenCalledWith(
            'tripBlock.trips',
            'trips',
        );
        // 読み込む側の別名（trips）で絞ると、block の列車が動かす 1 本だけになる
        expect(qb.where).not.toHaveBeenCalled();
    });
});
