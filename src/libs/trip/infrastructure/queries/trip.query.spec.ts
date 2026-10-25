import type { MockedFunction } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { parseSelection } from '../../../../core/utils/selection/parse-selection.js';
import { TRIPS_BY_STATION_SELECTION_TREE } from '../../usecase/trips-by-station-selection.js';
import { TripModel } from '../models/trip.model.js';
import { TripQuery } from './trip.query.js';

type AnyMock = MockedFunction<(...args: any[]) => any>;

describe('TripQuery - findManyByStationIdWithSelection', () => {
    let qb: Record<string, AnyMock>;
    let query: TripQuery;
    const params = { stationId: 'st1', calendarId: 'c1', tripDirection: 0 };

    const select = (raw: { include?: unknown; fields?: unknown }) =>
        parseSelection(raw, TRIPS_BY_STATION_SELECTION_TREE)!;

    beforeEach(async () => {
        qb = {};
        for (const method of [
            'select',
            'addSelect',
            'innerJoin',
            'leftJoin',
            'where',
            'andWhere',
            'orderBy',
            'addOrderBy',
        ]) {
            qb[method] = vi.fn().mockReturnValue(qb);
        }
        qb.getMany = vi.fn().mockResolvedValue([
            {
                id: 't1',
                tripNumber: '1001',
                extraCalendarId: null,
                times: [
                    { id: 'tm1', stationId: 'st1', departureTime: '05:00:00' },
                ],
                tripOperationLists: [{ id: 'tol1', operationId: 'o1' }],
            },
        ]);
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TripQuery,
                {
                    provide: getRepositoryToken(TripModel),
                    useValue: { createQueryBuilder: () => qb },
                },
            ],
        }).compile();
        query = module.get(TripQuery);
    });

    it('時刻を返さなくても、その駅の時刻で絞って並べる', async () => {
        const result = await query.findManyByStationIdWithSelection(
            params,
            select({
                include: '',
                fields: { trip: 'tripNumber,extraCalendarId' },
            }),
        );

        expect(qb.select).toHaveBeenCalledWith([
            'trip.id',
            'trip.tripNumber',
            'trip.extraCalendarId',
        ]);
        expect(qb.innerJoin).toHaveBeenCalledWith(
            'trip.times',
            'stationTime',
            expect.stringContaining('stationTime.stationId = :stationId'),
            { stationId: 'st1' },
        );
        expect(qb.leftJoin).not.toHaveBeenCalled();
        expect(qb.where).toHaveBeenCalledWith('trip.calendarId = :calendarId', {
            calendarId: 'c1',
        });
        expect(qb.andWhere).toHaveBeenCalledWith(
            'trip.tripDirection = :tripDirection',
            { tripDirection: 0 },
        );
        expect(qb.orderBy).toHaveBeenCalledWith(
            'stationTime.arrivalDays',
            'ASC',
            'NULLS LAST',
        );
        expect(qb.addOrderBy).toHaveBeenCalledWith(
            'stationTime.departureTime',
            'ASC',
            'NULLS LAST',
        );
        expect(result).toEqual([{ id: 't1', tripNumber: '1001' }]);
    });

    it('fields[time] だけなら時刻を結合する', async () => {
        const result = await query.findManyByStationIdWithSelection(
            params,
            select({ fields: { time: 'stationId,departureTime' } }),
        );

        expect(qb.leftJoin).toHaveBeenCalledWith('trip.times', 'times');
        expect(qb.leftJoin).not.toHaveBeenCalledWith(
            'trip.tripOperationLists',
            'tripOperationLists',
        );
        expect(qb.addSelect).toHaveBeenCalledWith([
            'times.id',
            'times.stationId',
            'times.departureTime',
        ]);
        expect(result).toEqual([
            {
                id: 't1',
                tripNumber: '1001',
                times: [{ stationId: 'st1', departureTime: '05:00:00' }],
            },
        ]);
    });

    it('include=tripOperationLists なら運用区間を結合する', async () => {
        await query.findManyByStationIdWithSelection(
            params,
            select({
                include: 'tripOperationLists',
                fields: { tripOperationList: 'operationId' },
            }),
        );

        expect(qb.leftJoin).toHaveBeenCalledWith(
            'trip.tripOperationLists',
            'tripOperationLists',
        );
        expect(qb.addSelect).toHaveBeenCalledWith([
            'tripOperationLists.id',
            'tripOperationLists.operationId',
        ]);
    });
});
