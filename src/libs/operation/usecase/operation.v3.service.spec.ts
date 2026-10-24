import type { MockedFunction } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ItinerarySegmentQuery } from '../infrastructure/queries/itinerary-segment.query.js';
import { OperationQuery } from '../infrastructure/queries/operation.query.js';
import { OperationCurrentPositionDto } from './dtos/operation-current-position.dto.js';
import { OperationDetailsDto } from './dtos/operation-details.dto.js';
import { OperationWithTripsDto } from './dtos/operation-with-trips.dto.js';
import { OperationV3Service } from './operation.v3.service.js';

type AnyMock = MockedFunction<(...args: any[]) => any>;

const mockOperationQuery = {
    findManyByCalendarId: vi.fn() as AnyMock,
    findManyBySpecificPeriod: vi.fn() as AnyMock,
    findManyBySpecificPeriodWithSelection: vi.fn() as AnyMock,
    findOneWithTrips: vi.fn() as AnyMock,
    findOneWithTripsWithSelection: vi.fn() as AnyMock,
    findOneWithCurrentPosition: vi.fn() as AnyMock,
    findManyWithCurrentPosition: vi.fn() as AnyMock,
    findManyWithTrips: vi.fn() as AnyMock,
    findManyWithTripsWithSelection: vi.fn() as AnyMock,
};

const mockItinerarySegmentQuery = {
    findManyByCalendarId: vi.fn() as AnyMock,
};

async function buildService(): Promise<OperationV3Service> {
    const module: TestingModule = await Test.createTestingModule({
        providers: [
            OperationV3Service,
            { provide: OperationQuery, useValue: mockOperationQuery },
            {
                provide: ItinerarySegmentQuery,
                useValue: mockItinerarySegmentQuery,
            },
        ],
    }).compile();

    return module.get<OperationV3Service>(OperationV3Service);
}

describe('OperationV3Service', () => {
    let service: OperationV3Service;

    beforeEach(async () => {
        vi.clearAllMocks();
        service = await buildService();
    });

    describe('findManyByCalendarId', () => {
        it('calendarId を OperationQuery に渡してそのまま返す', async () => {
            const expected: OperationDetailsDto[] = [
                { operationId: 'op-1' } as OperationDetailsDto,
            ];
            mockOperationQuery.findManyByCalendarId.mockResolvedValue(expected);

            const result = await service.findManyByCalendarId({
                calendarId: 'cal-1',
            });

            expect(
                mockOperationQuery.findManyByCalendarId,
            ).toHaveBeenCalledWith({ calendarId: 'cal-1' });
            expect(result).toBe(expected);
        });
    });

    describe('findManyBySpecificPeriod', () => {
        it('start / end を OperationQuery に渡してそのまま返す', async () => {
            const expected: OperationDetailsDto[] = [
                { operationId: 'op-2' } as OperationDetailsDto,
            ];
            mockOperationQuery.findManyBySpecificPeriod.mockResolvedValue(
                expected,
            );

            const result = await service.findManyBySpecificPeriod({
                start: '2024-01-01',
                end: '2024-01-31',
            });

            expect(
                mockOperationQuery.findManyBySpecificPeriod,
            ).toHaveBeenCalledWith({
                start: '2024-01-01',
                end: '2024-01-31',
            });
            expect(result).toBe(expected);
        });
    });

    describe('findOneWithCurrentPosition', () => {
        it('operationId と searchTime を OperationQuery に渡してそのまま返す', async () => {
            const expected = {
                operationId: 'op-3',
            } as unknown as OperationCurrentPositionDto;
            mockOperationQuery.findOneWithCurrentPosition.mockResolvedValue(
                expected,
            );

            const result = await service.findOneWithCurrentPosition({
                operationId: 'op-3',
                searchTime: '12:00:00',
            });

            expect(
                mockOperationQuery.findOneWithCurrentPosition,
            ).toHaveBeenCalledWith({
                operationId: 'op-3',
                searchTime: '12:00:00',
            });
            expect(result).toBe(expected);
        });

        it('searchTime を省略しても OperationQuery に渡す', async () => {
            const expected = {
                operationId: 'op-4',
            } as unknown as OperationCurrentPositionDto;
            mockOperationQuery.findOneWithCurrentPosition.mockResolvedValue(
                expected,
            );

            const result = await service.findOneWithCurrentPosition({
                operationId: 'op-4',
            });

            expect(
                mockOperationQuery.findOneWithCurrentPosition,
            ).toHaveBeenCalledWith({
                operationId: 'op-4',
                searchTime: undefined,
            });
            expect(result).toBe(expected);
        });
    });

    describe('findManyWithTrips', () => {
        it('calendarId を OperationQuery に渡し、全運用の列車つきをそのまま返す', async () => {
            const expected = [
                { operation: { operationId: 'op-5' }, trips: [] },
            ] as unknown as OperationWithTripsDto[];
            mockOperationQuery.findManyWithTrips.mockResolvedValue(expected);

            const result = await service.findManyWithTrips({
                calendarId: 'cal-2',
            });

            expect(mockOperationQuery.findManyWithTrips).toHaveBeenCalledWith({
                calendarId: 'cal-2',
            });
            expect(result).toBe(expected);
        });

        it('include・fields が無ければ全部入りの口を呼び、選択の口は呼ばない', async () => {
            mockOperationQuery.findManyWithTrips.mockResolvedValue([]);

            await service.findManyWithTrips({ calendarId: 'c1' });

            expect(mockOperationQuery.findManyWithTrips).toHaveBeenCalledWith({
                calendarId: 'c1',
            });
            expect(
                mockOperationQuery.findManyWithTripsWithSelection,
            ).not.toHaveBeenCalled();
        });

        it('include があれば選択の口に解釈した指定を渡す', async () => {
            const expected = [{ operation: { id: 'op-1' } }];
            mockOperationQuery.findManyWithTripsWithSelection.mockResolvedValue(
                expected,
            );

            const result = await service.findManyWithTrips({
                calendarId: 'c1',
                include: 'trips.startTime',
            });

            expect(
                mockOperationQuery.findManyWithTripsWithSelection,
            ).toHaveBeenCalledWith(
                { calendarId: 'c1' },
                {
                    paths: new Set(['operation', 'trips', 'trips.startTime']),
                    fields: new Map(),
                },
            );
            expect(mockOperationQuery.findManyWithTrips).not.toHaveBeenCalled();
            expect(result).toBe(expected);
        });

        it('指定できない資源は BadRequestException で reject する', async () => {
            await expect(
                service.findManyWithTrips({
                    calendarId: 'c1',
                    fields: { user: 'password' },
                }),
            ).rejects.toBeInstanceOf(BadRequestException);
            expect(
                mockOperationQuery.findManyWithTripsWithSelection,
            ).not.toHaveBeenCalled();
        });
    });

    describe('findAllGroups', () => {
        it('operationNumberCirculateMap を群ごとに集約して返す', () => {
            const result = service.findAllGroups();

            expect(result).toContainEqual({
                groupName: '1群',
                operationNumbers: ['11', '12', '13', '14', '15', '16'],
            });
            expect(result).toContainEqual({
                groupName: '9G群',
                operationNumbers: ['91G', '92G', '93G', '94G', '95G'],
            });
            // 群の数だけ返る（1群/5群/6群/7群/9G群 の 5 群）
            expect(result).toHaveLength(5);
        });
    });

    describe('findManyWithCurrentPosition', () => {
        it('運用 id と時刻を OperationQuery にまとめて渡してそのまま返す', async () => {
            const expected = [
                {
                    operation: { operationId: 'op-1' },
                } as OperationCurrentPositionDto,
            ];
            mockOperationQuery.findManyWithCurrentPosition.mockResolvedValue(
                expected,
            );

            const result = await service.findManyWithCurrentPosition({
                operationIds: ['op-1', 'op-2'],
                searchTime: '2026-05-30T15:00:00+09:00',
            });

            expect(
                mockOperationQuery.findManyWithCurrentPosition,
            ).toHaveBeenCalledWith({
                operationIds: ['op-1', 'op-2'],
                searchTime: '2026-05-30T15:00:00+09:00',
            });
            expect(result).toBe(expected);
        });

        it('時刻を指定しなければその瞬間の時刻を 1 つ決めて渡す', async () => {
            mockOperationQuery.findManyWithCurrentPosition.mockResolvedValue(
                [],
            );

            await service.findManyWithCurrentPosition({
                operationIds: ['op-1'],
            });

            expect(
                mockOperationQuery.findManyWithCurrentPosition.mock.calls[0][0]
                    .searchTime,
            ).toEqual(expect.any(String));
        });
    });
});

describe('OperationV3Service - 運用の from/to・:id/trips の選択', () => {
    let service: OperationV3Service;

    beforeEach(async () => {
        vi.clearAllMocks();
        service = await buildService();
    });

    it('from/to: 指定が無ければ今の取得', async () => {
        mockOperationQuery.findManyBySpecificPeriod.mockResolvedValue([]);
        await service.findManyBySpecificPeriod({
            start: '2026-10-24',
            end: '2026-10-24',
        });
        expect(mockOperationQuery.findManyBySpecificPeriod).toHaveBeenCalled();
        expect(
            mockOperationQuery.findManyBySpecificPeriodWithSelection,
        ).not.toHaveBeenCalled();
    });

    it('from/to: 木に無い道筋は 400', async () => {
        await expect(
            service.findManyBySpecificPeriod({
                start: '2026-10-24',
                end: '2026-10-24',
                include: 'trips',
            }),
        ).rejects.toThrow(BadRequestException);
    });

    it(':id/trips: 指定があれば選んだ取得', async () => {
        mockOperationQuery.findOneWithTripsWithSelection.mockResolvedValue(
            null,
        );
        await service.findOneWithTrips({
            operationId: 'op1',
            include: 'trips',
        });
        expect(
            mockOperationQuery.findOneWithTripsWithSelection,
        ).toHaveBeenCalledWith(
            { operationId: 'op1' },
            expect.objectContaining({ paths: new Set(['operation', 'trips']) }),
        );
        expect(mockOperationQuery.findOneWithTrips).not.toHaveBeenCalled();
    });
});

describe('OperationV3Service - read-model の fields', () => {
    let service: OperationV3Service;
    const position = {
        operation: {
            id: 'op1',
            calendarId: 'c1',
            operationNumber: '54',
            createdAt: new Date(0),
            updatedAt: new Date(0),
        },
        prev: null,
        current: {
            id: 'tol1',
            tripId: 't1',
            trip: { id: 't1', tripNumber: '6000', depotIn: false },
            startTime: { id: 'tm1', departureTime: '04:39:00' },
            endTime: { id: 'tm2', arrivalTime: '05:10:00' },
        },
        next: null,
    };

    beforeEach(async () => {
        vi.clearAllMocks();
        service = await buildService();
    });

    it('現在位置(複数): fields に挙げた資源だけを削り、挙げない資源は全項目', async () => {
        mockOperationQuery.findManyWithCurrentPosition.mockResolvedValue([
            position,
        ]);

        const result = await service.findManyWithCurrentPosition({
            operationIds: ['op1'],
            searchTime: '2026-10-24T05:00:00+09:00',
            fields: { trip: 'tripNumber' },
        });

        expect(result).toEqual([
            {
                operation: position.operation,
                current: {
                    id: 'tol1',
                    tripId: 't1',
                    trip: { id: 't1', tripNumber: '6000' },
                    startTime: { id: 'tm1', departureTime: '04:39:00' },
                    endTime: { id: 'tm2', arrivalTime: '05:10:00' },
                },
            },
        ]);
    });

    it('現在位置(1 件): fields で削る。運用が無ければ null のまま', async () => {
        mockOperationQuery.findOneWithCurrentPosition.mockResolvedValue(
            position,
        );
        await expect(
            service.findOneWithCurrentPosition({
                operationId: 'op1',
                fields: { operation: 'operationNumber' },
            }),
        ).resolves.toMatchObject({
            operation: { id: 'op1', operationNumber: '54' },
        });

        mockOperationQuery.findOneWithCurrentPosition.mockResolvedValue(null);
        await expect(
            service.findOneWithCurrentPosition({
                operationId: 'op1',
                fields: { operation: 'operationNumber' },
            }),
        ).resolves.toBeNull();
    });

    it('現在位置: fields が無ければ query の結果をそのまま返す', async () => {
        mockOperationQuery.findManyWithCurrentPosition.mockResolvedValue([
            position,
        ]);

        const result = await service.findManyWithCurrentPosition({
            operationIds: ['op1'],
            searchTime: '2026-10-24T05:00:00+09:00',
        });

        expect(result).toEqual([position]);
        expect(
            mockOperationQuery.findManyWithCurrentPosition,
        ).toHaveBeenCalledWith({
            operationIds: ['op1'],
            searchTime: '2026-10-24T05:00:00+09:00',
        });
    });

    it('現在位置: include は 400', async () => {
        await expect(
            service.findOneWithCurrentPosition({
                operationId: 'op1',
                include: 'current',
            }),
        ).rejects.toThrow(BadRequestException);
        expect(
            mockOperationQuery.findOneWithCurrentPosition,
        ).not.toHaveBeenCalled();
    });

    it('つながり: fields で削る。include は 400', async () => {
        mockItinerarySegmentQuery.findManyByCalendarId.mockResolvedValue([
            {
                id: 'a',
                tripId: 'ta',
                tripBlockId: 'ta',
                operationId: 'opA',
                operationNumber: '11K',
                startStationId: 's1',
                endStationId: 'ebina',
                startSeconds: 100,
                endSeconds: 200,
                nextTripOperationListId: 'b',
            },
            {
                id: 'b',
                tripId: 'tb',
                tripBlockId: 'tb',
                operationId: 'opB',
                operationNumber: '12K',
                startStationId: 'ebina',
                endStationId: 's2',
                startSeconds: 300,
                endSeconds: 400,
                nextTripOperationListId: null,
            },
        ]);

        const result = await service.findManyItineraryLinks({
            calendarId: 'c1',
            fields: { itineraryLinkEnd: 'operationNumber' },
        });

        expect(result).toEqual([
            {
                tripOperationListId: 'a',
                tripId: 'ta',
                operationId: 'opA',
                next: { tripOperationListId: 'b', operationNumber: '12K' },
            },
            {
                tripOperationListId: 'b',
                tripId: 'tb',
                operationId: 'opB',
                previous: { tripOperationListId: 'a', operationNumber: '11K' },
            },
        ]);
        await expect(
            service.findManyItineraryLinks({
                calendarId: 'c1',
                include: 'previous',
            }),
        ).rejects.toThrow(BadRequestException);
    });

    it('次の運用の候補: fields で削る', async () => {
        mockItinerarySegmentQuery.findManyByCalendarId.mockResolvedValue([
            {
                id: 'b',
                tripId: 'tb',
                tripBlockId: 'tb',
                operationId: 'opB',
                operationNumber: '12K',
                startStationId: 'ebina',
                endStationId: 's2',
                startSeconds: 300,
                endSeconds: 400,
                nextTripOperationListId: null,
            },
        ]);

        const result = await service.findManyNextSegmentCandidates({
            calendarId: 'c1',
            stationId: 'ebina',
            afterSeconds: 0,
            fields: { nextSegmentCandidate: 'operationNumber,isTaken' },
        });

        expect(result).toEqual([
            {
                tripOperationListId: 'b',
                operationNumber: '12K',
                isTaken: false,
            },
        ]);
    });

    it('次の運用の候補: 駅が無くても fields は検める', async () => {
        await expect(
            service.findManyNextSegmentCandidates({
                calendarId: 'c1',
                afterSeconds: 0,
                fields: { nextSegmentCandidate: 'password' },
            }),
        ).rejects.toThrow(BadRequestException);
    });

    it('次の運用の候補: 駅が無ければ空で、query も呼ばない', async () => {
        await expect(
            service.findManyNextSegmentCandidates({
                calendarId: 'c1',
                afterSeconds: 0,
            }),
        ).resolves.toEqual([]);
        expect(
            mockItinerarySegmentQuery.findManyByCalendarId,
        ).not.toHaveBeenCalled();
    });
});
