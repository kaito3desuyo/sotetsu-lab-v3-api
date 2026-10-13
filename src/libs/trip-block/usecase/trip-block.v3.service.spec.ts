import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ItinerarySegmentQuery } from 'src/libs/operation/infrastructure/queries/itinerary-segment.query';
import { TripBlockCommand } from '../infrastructure/commands/trip-block.command';
import { TripBlockQuery } from '../infrastructure/queries/trip-block.query';
import { TripBlockDomainBuilder } from './builders/trip-block.domain.builder';
import { TripBlockV3Service } from './trip-block.v3.service';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyMock = jest.MockedFunction<(...args: any[]) => any>;

const mockItinerarySegmentQuery = {
    findManyByCalendarId: jest.fn() as AnyMock,
};
const mockTripBlockCommand = {
    replaceOneTripBlockByDomain: jest.fn() as AnyMock,
};

const mockTripBlockQuery = {
    findOneTripBlockByTripBlockId: jest.fn() as AnyMock,
    findManyByFilter: jest.fn() as AnyMock,
    findManyByFilterWithFields: jest.fn() as AnyMock,
};

describe('TripBlockV3Service - findManyByFilter', () => {
    let service: TripBlockV3Service;

    beforeEach(async () => {
        jest.clearAllMocks();
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
            mockTripBlockQuery.findManyByFilterWithFields,
        ).not.toHaveBeenCalled();
        expect(result).toBe(expected);
    });

    it('fields があれば許可リストで検めてから項目を絞った取得をする', async () => {
        const expected = [{ id: 'b1', trips: [] }];
        mockTripBlockQuery.findManyByFilterWithFields.mockResolvedValue(
            expected,
        );

        const result = await service.findManyByFilter({
            calendarId: 'c1',
            tripDirection: 1,
            fields: { trip: 'tripNumber', time: 'stationId,arrivalTime' },
        });

        expect(
            mockTripBlockQuery.findManyByFilterWithFields,
        ).toHaveBeenCalledWith(
            { calendarId: 'c1', tripDirection: 1 },
            new Map([
                ['trip', new Set(['tripNumber'])],
                ['time', new Set(['stationId', 'arrivalTime'])],
            ]),
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
            mockTripBlockQuery.findManyByFilterWithFields,
        ).not.toHaveBeenCalled();
    });
});

describe('TripBlockV3Service - 次の運用の検め', () => {
    let service: TripBlockV3Service;

    afterEach(() => jest.restoreAllMocks());

    beforeEach(async () => {
        jest.clearAllMocks();
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
        jest.spyOn(
            TripBlockDomainBuilder,
            'buildFromReplaceDto',
        ).mockReturnValue({} as never);
        mockTripBlockCommand.replaceOneTripBlockByDomain.mockResolvedValue({});
        await expect(
            service.replaceOneTripBlock({ id: 'blk', dto: dto as never }),
        ).resolves.toBeDefined();
        expect(
            mockTripBlockCommand.replaceOneTripBlockByDomain,
        ).toHaveBeenCalledTimes(1);
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
        jest.spyOn(
            TripBlockDomainBuilder,
            'buildFromReplaceDto',
        ).mockReturnValue({} as never);
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
