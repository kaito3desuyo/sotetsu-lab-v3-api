import type { MockedFunction } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SocketSignal } from '../../../core/modules/socket-signal/socket-signal.js';
import { ItinerarySegmentQuery } from '../../operation/infrastructure/queries/itinerary-segment.query.js';
import { TripBlockCommand } from '../infrastructure/commands/trip-block.command.js';
import { TripBlockQuery } from '../infrastructure/queries/trip-block.query.js';
import {
    TripBlockDomainBuilder,
    TripBlocksDomainBuilder,
} from './builders/trip-block.domain.builder.js';
import { TripBlockV3Service } from './trip-block.v3.service.js';

type AnyMock = MockedFunction<(...args: any[]) => any>;

const mockItinerarySegmentQuery = {
    findManyByCalendarId: vi.fn() as AnyMock,
};
const mockTripBlockCommand = {
    replaceOneTripBlockByDomain: vi.fn() as AnyMock,
    bulkCreate: vi.fn() as AnyMock,
    deleteOneTripBlockByDomain: vi.fn() as AnyMock,
};
const mockSignalSend = vi.fn() as AnyMock;

const mockTripBlockQuery = {
    findOneTripBlockByTripBlockId: vi.fn() as AnyMock,
    findOneTripBlockByTripId: vi.fn() as AnyMock,
    findOneById: vi.fn() as AnyMock,
    findManyByFilter: vi.fn() as AnyMock,
    findManyByFilterWithSelection: vi.fn() as AnyMock,
};

describe('TripBlockV3Service - findManyByFilter', () => {
    let service: TripBlockV3Service;

    beforeEach(async () => {
        vi.clearAllMocks();
        mockTripBlockQuery.findOneTripBlockByTripBlockId.mockResolvedValue(
            null,
        );
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TripBlockV3Service,
                { provide: TripBlockQuery, useValue: mockTripBlockQuery },
                { provide: TripBlockCommand, useValue: mockTripBlockCommand },
                {
                    provide: ItinerarySegmentQuery,
                    useValue: mockItinerarySegmentQuery,
                },
                { provide: SocketSignal, useValue: { send: mockSignalSend } },
            ],
        }).compile();
        service = module.get(TripBlockV3Service);
    });

    it('fields が無ければ今までどおり全項目の取得をする', async () => {
        const expected = [{ tripBlockId: 'b1' }];
        mockTripBlockQuery.findManyByFilter.mockResolvedValue(expected);

        const result = await service.findManyByFilter({
            calendarId: 'c1',
            tripDirection: 0,
        });

        expect(mockTripBlockQuery.findManyByFilter).toHaveBeenCalledWith({
            calendarId: 'c1',
            tripDirection: 0,
        });
        expect(
            mockTripBlockQuery.findManyByFilterWithSelection,
        ).not.toHaveBeenCalled();
        expect(result).toBe(expected);
    });

    it('fields があれば木で検めてから項目を絞った取得をする', async () => {
        const expected = [{ id: 'b1', trips: [] }];
        mockTripBlockQuery.findManyByFilterWithSelection.mockResolvedValue(
            expected,
        );

        const result = await service.findManyByFilter({
            calendarId: 'c1',
            tripDirection: 1,
            fields: { trip: 'tripNumber', time: 'stationId,arrivalTime' },
        });

        expect(
            mockTripBlockQuery.findManyByFilterWithSelection,
        ).toHaveBeenCalledWith(
            { calendarId: 'c1', tripDirection: 1 },
            {
                paths: new Set(['trips', 'trips.times']),
                fields: new Map([
                    ['trip', new Set(['tripNumber'])],
                    ['time', new Set(['stationId', 'arrivalTime'])],
                ]),
            },
        );
        expect(mockTripBlockQuery.findManyByFilter).not.toHaveBeenCalled();
        expect(result).toBe(expected);
    });

    it('許可リストに無い項目は 400', async () => {
        await expect(
            service.findManyByFilter({
                calendarId: 'c1',
                tripDirection: 0,
                fields: { trip: 'password' },
            }),
        ).rejects.toThrow(BadRequestException);
        expect(
            mockTripBlockQuery.findManyByFilterWithSelection,
        ).not.toHaveBeenCalled();
    });

    it('include があれば木で検めてから関連を選んだ取得をする', async () => {
        mockTripBlockQuery.findManyByFilterWithSelection.mockResolvedValue([]);

        await service.findManyByFilter({
            calendarId: 'c1',
            tripDirection: 0,
            include: 'trips.tripClass',
        });

        expect(
            mockTripBlockQuery.findManyByFilterWithSelection,
        ).toHaveBeenCalledWith(
            { calendarId: 'c1', tripDirection: 0 },
            { paths: new Set(['trips', 'trips.tripClass']), fields: new Map() },
        );
    });

    it('木に無い道筋は 400', async () => {
        await expect(
            service.findManyByFilter({
                calendarId: 'c1',
                tripDirection: 0,
                include: 'trips.service',
            }),
        ).rejects.toThrow(BadRequestException);
    });

    it('include が崩れた形（オブジェクト）なら 400', async () => {
        await expect(
            service.findManyByFilter({
                calendarId: 'c1',
                tripDirection: 0,
                include: { a: 'b' },
            }),
        ).rejects.toThrow(BadRequestException);
    });

    it('fields が崩れた形（文字列）なら 400', async () => {
        await expect(
            service.findManyByFilter({
                calendarId: 'c1',
                tripDirection: 0,
                fields: 'tripNumber',
            }),
        ).rejects.toThrow(
            new BadRequestException(
                'fields は fields[資源]=項目,項目 の形で指定する',
            ),
        );
    });
});

describe('TripBlockV3Service - 次の運用の検め', () => {
    let service: TripBlockV3Service;

    afterEach(() => vi.restoreAllMocks());

    beforeEach(async () => {
        vi.clearAllMocks();
        mockTripBlockQuery.findOneTripBlockByTripBlockId.mockResolvedValue(
            null,
        );
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TripBlockV3Service,
                { provide: TripBlockQuery, useValue: mockTripBlockQuery },
                { provide: TripBlockCommand, useValue: mockTripBlockCommand },
                {
                    provide: ItinerarySegmentQuery,
                    useValue: mockItinerarySegmentQuery,
                },
                { provide: SocketSignal, useValue: { send: mockSignalSend } },
            ],
        }).compile();
        service = module.get(TripBlockV3Service);
    });

    it('次の運用が輪になる書き込みは保存しない', async () => {
        mockItinerarySegmentQuery.findManyByCalendarId.mockResolvedValue([
            { id: 'a', nextTripOperationListId: null },
            { id: 'b', nextTripOperationListId: 'a' },
        ]);
        await expect(
            service.replaceOneTripBlock({
                id: 'blk',
                dto: {
                    trips: [
                        {
                            calendarId: 'c',
                            tripOperationLists: [
                                { id: 'a', nextTripOperationListId: 'b' },
                            ],
                        },
                    ],
                } as never,
            }),
        ).rejects.toThrow('次の運用が輪になっています');
        expect(
            mockTripBlockCommand.replaceOneTripBlockByDomain,
        ).not.toHaveBeenCalled();
        expect(mockSignalSend).not.toHaveBeenCalled();
    });

    const seg = (id: string, next: string | null) => ({
        id,
        tripId: id,
        tripBlockId: `blk-${id}`,
        operationId: 'o',
        operationNumber: '1',
        startStationId: 'a',
        endStationId: 'b',
        startSeconds: 0,
        endSeconds: 1,
        nextTripOperationListId: next,
    });

    it('別の列車へ付け替えた「次の運用」（外す側が先でも）は通す', async () => {
        mockItinerarySegmentQuery.findManyByCalendarId.mockResolvedValue([
            seg('a', 'T'),
            seg('b', null),
            seg('T', null),
        ]);
        const dto = {
            trips: [
                {
                    calendarId: 'c',
                    tripOperationLists: [
                        { id: 'a', nextTripOperationListId: null },
                    ],
                },
                {
                    calendarId: 'c',
                    tripOperationLists: [
                        { id: 'b', nextTripOperationListId: 'T' },
                    ],
                },
            ],
        };
        vi.spyOn(TripBlockDomainBuilder, 'buildFromReplaceDto').mockReturnValue(
            {} as never,
        );
        mockTripBlockCommand.replaceOneTripBlockByDomain.mockResolvedValue({});
        await expect(
            service.replaceOneTripBlock({ id: 'blk', dto: dto as never }),
        ).resolves.toBeDefined();
        expect(
            mockTripBlockCommand.replaceOneTripBlockByDomain,
        ).toHaveBeenCalledTimes(1);
        expect(mockSignalSend).toHaveBeenCalledWith({ type: 'timetable' });
    });

    it('置き換えで消える区間の指していた先は、新しい区間が指せる', async () => {
        mockItinerarySegmentQuery.findManyByCalendarId.mockResolvedValue([
            seg('a', null),
            seg('c', 'T'),
            seg('T', null),
        ]);
        mockTripBlockQuery.findOneTripBlockByTripBlockId.mockResolvedValue({
            trips: [{ tripOperationLists: [{ id: 'c' }, { id: 'a' }] }],
        });
        vi.spyOn(TripBlockDomainBuilder, 'buildFromReplaceDto').mockReturnValue(
            {} as never,
        );
        mockTripBlockCommand.replaceOneTripBlockByDomain.mockResolvedValue({});
        await expect(
            service.replaceOneTripBlock({
                id: 'blk',
                dto: {
                    trips: [
                        {
                            calendarId: 'c',
                            tripOperationLists: [
                                { id: 'a', nextTripOperationListId: 'T' },
                            ],
                        },
                    ],
                } as never,
            }),
        ).resolves.toBeDefined();
        expect(
            mockTripBlockCommand.replaceOneTripBlockByDomain,
        ).toHaveBeenCalledTimes(1);
    });

    it('ダイヤのない列車に次の運用は付けられない', async () => {
        await expect(
            service.replaceOneTripBlock({
                id: 'blk',
                dto: {
                    trips: [
                        {
                            calendarId: null,
                            tripOperationLists: [
                                { id: 'a', nextTripOperationListId: 'b' },
                            ],
                        },
                    ],
                } as never,
            }),
        ).rejects.toThrow('ダイヤのない列車には次の運用を設定できません');
    });

    it('次の運用がすべて null か省略なら、現在の取得も区間の読み込みもしない', async () => {
        await service
            .replaceOneTripBlock({
                id: 'blk',
                dto: {
                    trips: [
                        {
                            calendarId: 'c',
                            tripOperationLists: [
                                { id: 'a', nextTripOperationListId: null },
                                { id: 'b' },
                            ],
                        },
                    ],
                } as never,
            })
            .catch(() => undefined);
        expect(
            mockTripBlockQuery.findOneTripBlockByTripBlockId,
        ).not.toHaveBeenCalled();
        expect(
            mockItinerarySegmentQuery.findManyByCalendarId,
        ).not.toHaveBeenCalled();
    });

    it('1 つでも次の運用があれば、今までどおり取得して検める', async () => {
        mockItinerarySegmentQuery.findManyByCalendarId.mockResolvedValue([]);
        await service
            .replaceOneTripBlock({
                id: 'blk',
                dto: {
                    trips: [
                        {
                            calendarId: 'c',
                            tripOperationLists: [
                                { id: 'a', nextTripOperationListId: 'b' },
                            ],
                        },
                    ],
                } as never,
            })
            .catch(() => undefined);
        expect(
            mockTripBlockQuery.findOneTripBlockByTripBlockId,
        ).toHaveBeenCalled();
        expect(
            mockItinerarySegmentQuery.findManyByCalendarId,
        ).toHaveBeenCalled();
    });

    it('新しく作る列車の区間が決まり 1 とぶつかる次の運用は 422', async () => {
        const blk = { ...seg('B', null), tripBlockId: 'blk-old' };
        mockItinerarySegmentQuery.findManyByCalendarId.mockResolvedValue([
            {
                ...blk,
                id: 'B',
                tripBlockId: 'new-block-0',
                startStationId: 'X',
                startSeconds: 100,
                endSeconds: 200,
            },
            seg('Z', null),
        ]);
        await expect(
            service.createManyTripBlocks([
                {
                    trips: [
                        {
                            calendarId: 'c',
                            times: [
                                {
                                    stationId: 's',
                                    departureDays: 1,
                                    departureTime: '00:00:00',
                                    arrivalDays: null,
                                    arrivalTime: null,
                                },
                                {
                                    stationId: 'X',
                                    arrivalDays: 1,
                                    arrivalTime: '00:01:40',
                                    departureDays: 1,
                                    departureTime: '00:01:40',
                                },
                            ],
                            tripOperationLists: [
                                {
                                    operationId: 'o',
                                    startStationId: 's',
                                    endStationId: 'X',
                                    nextTripOperationListId: 'Z',
                                },
                            ],
                        },
                    ],
                },
            ] as never),
        ).rejects.toThrow('列車の途中で運番が替わる区間には');
    });
});

describe('TripBlockV3Service - 保存を socket に知らせる', () => {
    let service: TripBlockV3Service;

    afterEach(() => vi.restoreAllMocks());

    beforeEach(async () => {
        vi.clearAllMocks();
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TripBlockV3Service,
                { provide: TripBlockQuery, useValue: mockTripBlockQuery },
                { provide: TripBlockCommand, useValue: mockTripBlockCommand },
                {
                    provide: ItinerarySegmentQuery,
                    useValue: mockItinerarySegmentQuery,
                },
                { provide: SocketSignal, useValue: { send: mockSignalSend } },
            ],
        }).compile();
        service = module.get(TripBlockV3Service);
    });

    it('createManyTripBlocks は保存後に timetable を知らせる', async () => {
        vi.spyOn(TripBlocksDomainBuilder, 'buildFromCreateDto').mockReturnValue(
            [] as never,
        );
        mockTripBlockCommand.bulkCreate.mockResolvedValue([]);
        await service.createManyTripBlocks([]);
        expect(mockSignalSend).toHaveBeenCalledWith({ type: 'timetable' });
    });

    it('createManyTripBlocks の保存が失敗したら知らせない', async () => {
        vi.spyOn(TripBlocksDomainBuilder, 'buildFromCreateDto').mockReturnValue(
            [] as never,
        );
        mockTripBlockCommand.bulkCreate.mockRejectedValue(new Error('db'));
        await expect(service.createManyTripBlocks([])).rejects.toThrow('db');
        expect(mockSignalSend).not.toHaveBeenCalled();
    });

    it('replaceOneTripBlock は保存後に timetable を知らせる', async () => {
        vi.spyOn(TripBlockDomainBuilder, 'buildFromReplaceDto').mockReturnValue(
            {} as never,
        );
        mockTripBlockCommand.replaceOneTripBlockByDomain.mockResolvedValue({});
        await service.replaceOneTripBlock({
            id: 'blk',
            dto: { trips: [] } as never,
        });
        expect(mockSignalSend).toHaveBeenCalledWith({ type: 'timetable' });
    });

    it('addTripToTripBlock は保存後に timetable を知らせる', async () => {
        const trip = {};
        const from = {
            getTripByTripId: vi.fn().mockReturnValue(trip),
            removeTrip: vi.fn(),
            isTripEmpty: vi.fn().mockReturnValue(true),
        };
        const to = { addTrip: vi.fn() };
        mockTripBlockQuery.findOneTripBlockByTripId.mockResolvedValue({});
        mockTripBlockQuery.findOneTripBlockByTripBlockId.mockResolvedValue({});
        mockTripBlockQuery.findOneById.mockResolvedValue({ id: 'to' });
        vi.spyOn(TripBlockDomainBuilder, 'buildFromDetailsDto')
            .mockReturnValueOnce(from as never)
            .mockReturnValueOnce(to as never);
        mockTripBlockCommand.replaceOneTripBlockByDomain.mockResolvedValue({});
        mockTripBlockCommand.deleteOneTripBlockByDomain.mockResolvedValue(
            undefined,
        );
        await service.addTripToTripBlock({
            id: 'to',
            dto: { tripId: 't1' } as never,
        });
        expect(mockSignalSend).toHaveBeenCalledWith({ type: 'timetable' });
    });

    it('addTripToTripBlock が見つからなければ知らせない', async () => {
        mockTripBlockQuery.findOneTripBlockByTripId.mockResolvedValue(null);
        mockTripBlockQuery.findOneTripBlockByTripBlockId.mockResolvedValue({});
        await expect(
            service.addTripToTripBlock({
                id: 'to',
                dto: { tripId: 't1' } as never,
            }),
        ).rejects.toThrow();
        expect(mockSignalSend).not.toHaveBeenCalled();
    });

    it('deleteTripFromTripBlock は保存後に timetable を知らせる', async () => {
        const block = {
            getTripByTripId: vi.fn().mockReturnValue({}),
            removeTrip: vi.fn(),
            isTripEmpty: vi.fn().mockReturnValue(false),
        };
        mockTripBlockQuery.findOneTripBlockByTripBlockId.mockResolvedValue({});
        mockTripBlockQuery.findOneById.mockResolvedValue({ id: 'blk' });
        vi.spyOn(TripBlockDomainBuilder, 'buildFromDetailsDto').mockReturnValue(
            block as never,
        );
        mockTripBlockCommand.replaceOneTripBlockByDomain.mockResolvedValue({});
        await service.deleteTripFromTripBlock({
            id: 'blk',
            dto: { tripId: 't1', holdAsAnotherTripBlock: false } as never,
        });
        expect(mockSignalSend).toHaveBeenCalledWith({ type: 'timetable' });
    });

    it('deleteTripFromTripBlock が見つからなければ知らせない', async () => {
        mockTripBlockQuery.findOneTripBlockByTripBlockId.mockResolvedValue(
            null,
        );
        await expect(
            service.deleteTripFromTripBlock({
                id: 'blk',
                dto: { tripId: 't1' } as never,
            }),
        ).rejects.toThrow();
        expect(mockSignalSend).not.toHaveBeenCalled();
    });
});
