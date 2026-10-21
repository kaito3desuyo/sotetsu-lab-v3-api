import { Test } from '@nestjs/testing';
import { OperationQuery } from '../../operation/infrastructure/queries/operation.query.js';
import { TripBlocks } from '../domain/trip-block.domain.js';
import { TripBlockCommand } from '../infrastructure/commands/trip-block.command.js';
import { TripBlockQuery } from '../infrastructure/queries/trip-block.query.js';
import { TripBlockCliService } from './trip-block.cli.service.js';

const time = (id: string, tripId: string, stationId: string, seq: number) => ({
    id,
    tripId,
    stationId,
    stopId: null,
    stopSequence: seq,
    pickupType: 0,
    dropoffType: 0,
    arrivalDays: 1,
    arrivalTime: `10:0${seq}:00`,
    departureDays: 1,
    departureTime: `10:0${seq}:30`,
});

const trip = (id: string, tripNumber: string, operationId: string) => ({
    id,
    serviceId: 'svc',
    tripNumber,
    tripClassId: 'cls',
    tripName: null,
    tripDirection: 0,
    tripBlockId: 'block',
    depotIn: false,
    depotOut: false,
    calendarId: 'from',
    extraCalendarId: null,
    times: [time(`${id}-t1`, id, 's1', 1), time(`${id}-t2`, id, 's2', 2)],
    tripOperationLists: [
        {
            id: `${id}-tol`,
            tripId: id,
            operationId,
            startStationId: 's1',
            endStationId: 's2',
            startTimeId: `${id}-t1`,
            endTimeId: `${id}-t2`,
            nextTripOperationListId: null,
        },
    ],
});

describe('TripBlockCliService.copyTripBlocks', () => {
    it('列車をコピー先のダイヤに付け替え、運用は同じ番号のものへ、無ければ外す', async () => {
        const bulkCreate = vi.fn().mockResolvedValue([]);
        const operationFindMany = vi
            .fn()
            .mockResolvedValueOnce([
                { id: 'opA', operationNumber: '11' },
                { id: 'opB', operationNumber: '12' },
            ])
            .mockResolvedValueOnce([{ id: 'opA2', operationNumber: '11' }]);
        const module = await Test.createTestingModule({
            providers: [
                TripBlockCliService,
                { provide: TripBlockCommand, useValue: { bulkCreate } },
                {
                    provide: TripBlockQuery,
                    useValue: {
                        findMany: vi.fn().mockResolvedValue([
                            {
                                id: 'block',
                                trips: [
                                    trip('trip1', '1001', 'opA'),
                                    trip('trip2', '1002', 'opB'),
                                ],
                            },
                        ]),
                    },
                },
                {
                    provide: OperationQuery,
                    useValue: { findMany: operationFindMany },
                },
            ],
        }).compile();
        vi.spyOn(console, 'log').mockImplementation(() => undefined);

        await module.get(TripBlockCliService).copyTripBlocks('from', 'to');

        const blocks: TripBlocks = bulkCreate.mock.calls[0][0];
        const [block] = blocks.getItems();
        expect(block.id.value).not.toBe('block');
        const [trip1, trip2] = block.getTripItems();

        expect(trip1.id.value).not.toBe('trip1');
        expect(trip1.props.calendarId).toBe('to');
        expect(trip1.props.tripBlockId).toBe(block.id.value);
        const times = trip1.props.times.getItems();
        expect(times.map((t) => t.props.stationId)).toEqual(['s1', 's2']);
        expect(times.every((t) => t.props.tripId === trip1.id.value)).toBe(
            true,
        );
        const [tol] = trip1.props.tripOperationLists.getItems();
        expect(tol.props.operationId).toBe('opA2');
        expect(tol.props.tripId).toBe(trip1.id.value);
        expect(tol.props.startTimeId).toBe(times[0].id.value);
        expect(tol.props.endTimeId).toBe(times[1].id.value);

        expect(trip2.props.calendarId).toBe('to');
        expect(trip2.props.tripOperationLists.getItems()).toEqual([]);
    });
});
