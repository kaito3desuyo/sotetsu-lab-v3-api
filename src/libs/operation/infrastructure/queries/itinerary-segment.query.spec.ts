import type { Mock } from 'vitest';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TripOperationListModel } from 'src/libs/trip/infrastructure/models/trip-operation-list.model';
import { ItinerarySegmentQuery } from './itinerary-segment.query';

const getRawMany = vi.fn();
const qb: Record<string, Mock> = {};
for (const m of ['select', 'addSelect', 'innerJoin', 'where'])
    qb[m] = vi.fn(() => qb);
qb.getRawMany = getRawMany;

describe('ItinerarySegmentQuery', () => {
    let query: ItinerarySegmentQuery;
    beforeEach(async () => {
        vi.clearAllMocks();
        const module = await Test.createTestingModule({
            providers: [
                ItinerarySegmentQuery,
                {
                    provide: getRepositoryToken(TripOperationListModel),
                    useValue: { createQueryBuilder: () => qb },
                },
            ],
        }).compile();
        query = module.get(ItinerarySegmentQuery);
    });

    it('行を区間にし、時刻は鉄道日の 0 時からの秒にする', async () => {
        getRawMany.mockResolvedValue([
            {
                id: 'a',
                tripId: 't',
                tripBlockId: 'b',
                operationId: 'o',
                operationNumber: '11K',
                startStationId: 's1',
                endStationId: 's2',
                departureDays: 1,
                departureTime: '08:00:00',
                arrivalDays: 2,
                arrivalTime: '00:10:00',
                nextTripOperationListId: null,
            },
        ]);
        expect(await query.findManyByCalendarId({ calendarId: 'c' })).toEqual([
            {
                id: 'a',
                tripId: 't',
                tripBlockId: 'b',
                operationId: 'o',
                operationNumber: '11K',
                startStationId: 's1',
                endStationId: 's2',
                startSeconds: 8 * 3600,
                endSeconds: 86400 + 600,
                nextTripOperationListId: null,
            },
        ]);
    });

    it('4 本の innerJoin と、カレンダーでの絞り込みを張る', async () => {
        getRawMany.mockResolvedValue([]);
        await query.findManyByCalendarId({ calendarId: 'c' });
        expect(qb.innerJoin.mock.calls).toEqual([
            ['tol.trip', 'trip'],
            ['tol.operation', 'operation'],
            ['tol.startTime', 'startTime'],
            ['tol.endTime', 'endTime'],
        ]);
        expect(qb.where).toHaveBeenCalledWith(
            'operation.calendarId = :calendarId',
            { calendarId: 'c' },
        );
    });

    it('発着の時刻が無い区間は落とす（つながりを判定できないため）', async () => {
        getRawMany.mockResolvedValue([
            {
                id: 'a',
                tripId: 't',
                tripBlockId: 'b',
                operationId: 'o',
                operationNumber: '1',
                startStationId: 's',
                endStationId: 's',
                departureDays: null,
                departureTime: null,
                arrivalDays: 1,
                arrivalTime: '08:00:00',
                nextTripOperationListId: null,
            },
        ]);
        expect(await query.findManyByCalendarId({ calendarId: 'c' })).toEqual(
            [],
        );
    });
});
