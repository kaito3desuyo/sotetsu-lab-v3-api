import type { MockedFunction } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ItinerarySegmentReader } from './itinerary-segment.reader.js';
import { OperationCurrentPositionReader } from './operation-current-position.reader.js';
import { OperationQuery } from '../infrastructure/queries/operation.query.js';
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
    findOneForCurrentPosition: vi.fn() as AnyMock,
    findManyForCurrentPosition: vi.fn() as AnyMock,
    findManyWithTrips: vi.fn() as AnyMock,
    findManyWithTripsWithSelection: vi.fn() as AnyMock,
};

const mockOperationCurrentPositionReader = {
    findManyForCurrentPosition: vi.fn() as AnyMock,
};

const mockItinerarySegmentReader = {
    findManyByCalendarId: vi.fn() as AnyMock,
};

async function buildService(): Promise<OperationV3Service> {
    const module: TestingModule = await Test.createTestingModule({
        providers: [
            OperationV3Service,
            { provide: OperationQuery, useValue: mockOperationQuery },
            {
                provide: ItinerarySegmentReader,
                useValue: mockItinerarySegmentReader,
            },
            {
                provide: OperationCurrentPositionReader,
                useValue: mockOperationCurrentPositionReader,
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

        it('fields[operation] の項目と id だけを返す。operationId は挙げたときだけ', async () => {
            mockOperationQuery.findManyByCalendarId.mockResolvedValue([
                {
                    id: 'o1',
                    operationId: 'o1',
                    calendarId: 'c1',
                    operationNumber: '11',
                },
            ]);

            await expect(
                service.findManyByCalendarId({
                    calendarId: 'c1',
                    fields: { operation: 'operationNumber' },
                }),
            ).resolves.toEqual([{ id: 'o1', operationNumber: '11' }]);
            await expect(
                service.findManyByCalendarId({
                    calendarId: 'c1',
                    fields: { operation: 'operationId' },
                }),
            ).resolves.toEqual([{ id: 'o1', operationId: 'o1' }]);
            expect(
                mockOperationQuery.findManyByCalendarId,
            ).toHaveBeenCalledWith({ calendarId: 'c1' });
        });

        it('include は 400 で、query を呼ばない', async () => {
            await expect(
                service.findManyByCalendarId({ calendarId: 'c1', include: '' }),
            ).rejects.toThrow(
                new BadRequestException('この口は include を指定できない'),
            );
            expect(
                mockOperationQuery.findManyByCalendarId,
            ).not.toHaveBeenCalled();
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
        const modelOf = (id: string) => ({
            id,
            calendarId: 'cal-1',
            operationNumber: '11K',
            tripOperationLists: [],
        });

        it('operationId を OperationQuery に渡し、引いた model から現在位置を組み立てて返す', async () => {
            mockOperationQuery.findOneForCurrentPosition.mockResolvedValue(
                modelOf('op-3'),
            );

            const result = await service.findOneWithCurrentPosition({
                operationId: 'op-3',
                searchTime: '2026-10-21T12:00:00+09:00',
            });

            expect(
                mockOperationQuery.findOneForCurrentPosition,
            ).toHaveBeenCalledWith({ operationId: 'op-3' });
            expect(result).toMatchObject({
                operation: { id: 'op-3' },
                prev: null,
                current: null,
                next: null,
            });
        });

        it('searchTime を省略しても現在位置を組み立てる', async () => {
            mockOperationQuery.findOneForCurrentPosition.mockResolvedValue(
                modelOf('op-4'),
            );

            const result = await service.findOneWithCurrentPosition({
                operationId: 'op-4',
            });

            expect(result).toMatchObject({ operation: { id: 'op-4' } });
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
        it('運用 id を OperationQuery にまとめて渡し、model ごとに現在位置を組み立てて返す', async () => {
            mockOperationCurrentPositionReader.findManyForCurrentPosition.mockResolvedValue(
                [
                    {
                        id: 'op-1',
                        calendarId: 'cal-1',
                        operationNumber: '11K',
                        tripOperationLists: [],
                    },
                    {
                        id: 'op-2',
                        calendarId: 'cal-1',
                        operationNumber: '12K',
                        tripOperationLists: [],
                    },
                ],
            );

            const result = await service.findManyWithCurrentPosition({
                operationIds: ['op-1', 'op-2'],
                searchTime: '2026-05-30T15:00:00+09:00',
            });

            expect(
                mockOperationCurrentPositionReader.findManyForCurrentPosition,
            ).toHaveBeenCalledWith({
                operationIds: ['op-1', 'op-2'],
                bypass: undefined,
            });
            expect(result).toMatchObject([
                { operation: { id: 'op-1' }, prev: null },
                { operation: { id: 'op-2' }, prev: null },
            ]);
        });

        it('時刻を指定しなくても、問い合わせ結果が無ければ空配列', async () => {
            mockOperationCurrentPositionReader.findManyForCurrentPosition.mockResolvedValue(
                [],
            );

            const result = await service.findManyWithCurrentPosition({
                operationIds: ['op-1'],
            });

            expect(result).toEqual([]);
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
    // 検索時刻 05:00 に tol1（04:39 → 05:10）を走っている運用の model
    const operationModel = {
        id: 'op1',
        calendarId: 'c1',
        operationNumber: '54',
        createdAt: new Date(0),
        updatedAt: new Date(0),
        tripOperationLists: [
            {
                id: 'tol1',
                tripId: 't1',
                trip: { id: 't1', tripNumber: '6000', depotIn: false },
                startTime: {
                    id: 'tm1',
                    departureDays: 1,
                    departureTime: '04:39:00',
                },
                endTime: {
                    id: 'tm2',
                    arrivalDays: 1,
                    arrivalTime: '05:10:00',
                },
            },
        ],
    };
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
            startTime: {
                id: 'tm1',
                departureDays: 1,
                departureTime: '04:39:00',
            },
            endTime: { id: 'tm2', arrivalDays: 1, arrivalTime: '05:10:00' },
        },
        next: null,
    };

    beforeEach(async () => {
        vi.clearAllMocks();
        service = await buildService();
    });

    it('現在位置(複数): fields に挙げた資源だけを削り、挙げない資源は全項目', async () => {
        mockOperationCurrentPositionReader.findManyForCurrentPosition.mockResolvedValue(
            [operationModel],
        );

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
                    startTime: {
                        id: 'tm1',
                        departureDays: 1,
                        departureTime: '04:39:00',
                    },
                    endTime: {
                        id: 'tm2',
                        arrivalDays: 1,
                        arrivalTime: '05:10:00',
                    },
                },
            },
        ]);
    });

    it('現在位置(1 件): fields で削る。運用が無ければ null のまま', async () => {
        mockOperationQuery.findOneForCurrentPosition.mockResolvedValue(
            operationModel,
        );
        await expect(
            service.findOneWithCurrentPosition({
                operationId: 'op1',
                fields: { operation: 'operationNumber' },
            }),
        ).resolves.toMatchObject({
            operation: { id: 'op1', operationNumber: '54' },
        });

        mockOperationQuery.findOneForCurrentPosition.mockResolvedValue(null);
        await expect(
            service.findOneWithCurrentPosition({
                operationId: 'op1',
                fields: { operation: 'operationNumber' },
            }),
        ).resolves.toBeNull();
    });

    it('現在位置: fields が無ければ組み立てた現在位置をそのまま返す', async () => {
        mockOperationCurrentPositionReader.findManyForCurrentPosition.mockResolvedValue(
            [operationModel],
        );

        const result = await service.findManyWithCurrentPosition({
            operationIds: ['op1'],
            searchTime: '2026-10-24T05:00:00+09:00',
        });

        expect(result).toMatchObject([position]);
        expect(
            mockOperationCurrentPositionReader.findManyForCurrentPosition,
        ).toHaveBeenCalledWith({ operationIds: ['op1'], bypass: undefined });
    });

    it('JSON を通したモデルでも位置の計算の結果が同じ', async () => {
        const viaJson = JSON.parse(JSON.stringify(operationModel));
        // createdAt・updatedAt は Date から ISO 文字列になる
        expect(operationModel.createdAt).toBeInstanceOf(Date);
        expect(viaJson.createdAt).toBe(new Date(0).toISOString());
        for (const fields of [undefined, { trip: 'tripNumber' }]) {
            mockOperationCurrentPositionReader.findManyForCurrentPosition.mockResolvedValueOnce(
                [operationModel],
            );
            const original = await service.findManyWithCurrentPosition({
                operationIds: ['op1'],
                searchTime: '2026-10-24T05:00:00+09:00',
                fields,
            });
            mockOperationCurrentPositionReader.findManyForCurrentPosition.mockResolvedValueOnce(
                [viaJson],
            );
            const cached = await service.findManyWithCurrentPosition({
                operationIds: ['op1'],
                searchTime: '2026-10-24T05:00:00+09:00',
                fields,
            });
            expect(JSON.parse(JSON.stringify(cached))).toEqual(
                JSON.parse(JSON.stringify(original)),
            );
        }
    });

    it('bypassCache を reader に渡す', async () => {
        mockOperationCurrentPositionReader.findManyForCurrentPosition.mockResolvedValue(
            [],
        );

        await service.findManyWithCurrentPosition({
            operationIds: ['op1'],
            bypassCache: true,
        });

        expect(
            mockOperationCurrentPositionReader.findManyForCurrentPosition,
        ).toHaveBeenCalledWith({ operationIds: ['op1'], bypass: true });
    });

    it('現在位置: include は 400', async () => {
        await expect(
            service.findOneWithCurrentPosition({
                operationId: 'op1',
                include: 'current',
            }),
        ).rejects.toThrow(BadRequestException);
        expect(
            mockOperationQuery.findOneForCurrentPosition,
        ).not.toHaveBeenCalled();
    });

    it('つながり: fields で削る。include は 400', async () => {
        mockItinerarySegmentReader.findManyByCalendarId.mockResolvedValue([
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
        mockItinerarySegmentReader.findManyByCalendarId.mockResolvedValue([
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
            mockItinerarySegmentReader.findManyByCalendarId,
        ).not.toHaveBeenCalled();
    });
});
