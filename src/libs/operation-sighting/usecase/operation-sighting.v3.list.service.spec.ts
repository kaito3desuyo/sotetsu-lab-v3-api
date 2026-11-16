import type { MockedFunction } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat.js';
import timezone from 'dayjs/plugin/timezone.js';
import utc from 'dayjs/plugin/utc.js';
import { OperationSightingAuthorQuery } from '../infrastructure/queries/operation-sighting-author.query.js';
import { OperationSightingQuery } from '../infrastructure/queries/operation-sighting.query.js';
import { CalendarQuery } from '../../calendar/infrastructure/queries/calendar.query.js';
import { OperationQuery } from '../../operation/infrastructure/queries/operation.query.js';
import { ItinerarySegmentQuery } from '../../operation/infrastructure/queries/itinerary-segment.query.js';
import { UnexpectedError } from '../../../core/classes/unexpected-error.js';
import { OperationSightingV3ListService } from './operation-sighting.v3.list.service.js';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);
dayjs.tz.setDefault('Asia/Tokyo');

vi.mock('../infrastructure/command/formation-cache-lock.js', () => ({
    lockFormationCache: vi.fn().mockResolvedValue(undefined),
}));

type AnyMock = MockedFunction<(...args: any[]) => any>;

const mockOperationSightingQuery = {
    findOneById: vi.fn() as AnyMock,
    findOneLatestByOperationNumberAndBeforeSightingTime: vi.fn() as AnyMock,
    findOneLatestByFormationNumberAndBeforeSightingTime: vi.fn() as AnyMock,
    findManyLatestByOperationNumbersAndBeforeSightingTime: vi.fn() as AnyMock,
    findManyLatestByFormationNumbersAndBeforeSightingTime: vi.fn() as AnyMock,
    findManyBySightingTimeRange: vi.fn() as AnyMock,
    findManyBySpecificPeriod: vi.fn() as AnyMock,
};
const mockAuthorQuery = {
    findManyByUserId: vi.fn() as AnyMock,
    findAuthorUserId: vi.fn() as AnyMock,
    findManyRecent: vi.fn() as AnyMock,
    findCorroborationFacts: vi.fn() as AnyMock,
};
const mockItinerarySegmentQuery = { findManyByCalendarId: vi.fn() as AnyMock };
const mockCalendarQuery = { findOneBySpecificDate: vi.fn() as AnyMock };
const mockOperationQuery = {
    findOneByCalendarIdAndOperationNumber: vi.fn() as AnyMock,
    findOneFirstDepartureTimeByOperationIdAndDate: vi.fn() as AnyMock,
    findManyByCalendarId: vi.fn() as AnyMock,
};

async function buildService(): Promise<OperationSightingV3ListService> {
    // 既定は区間なし・今日の目撃なし（今の判定の経路を使う）
    mockItinerarySegmentQuery.findManyByCalendarId.mockResolvedValue([]);
    mockOperationSightingQuery.findManyBySightingTimeRange.mockResolvedValue(
        [],
    );
    const module: TestingModule = await Test.createTestingModule({
        providers: [
            OperationSightingV3ListService,
            {
                provide: OperationSightingQuery,
                useValue: mockOperationSightingQuery,
            },
            {
                provide: OperationSightingAuthorQuery,
                useValue: mockAuthorQuery,
            },
            { provide: CalendarQuery, useValue: mockCalendarQuery },
            { provide: OperationQuery, useValue: mockOperationQuery },
            {
                provide: ItinerarySegmentQuery,
                useValue: mockItinerarySegmentQuery,
            },
        ],
    }).compile();
    return module.get(OperationSightingV3ListService);
}

describe('OperationSightingV3ListService - findManyBySpecificPeriod includeCarriedOver', () => {
    let service: OperationSightingV3ListService;
    const at = (hhmm: string) => dayjs(`2026-10-12 ${hhmm}`).toDate();
    const sighting = (id: string, op: string, f: string, hhmm: string) =>
        ({
            id,
            operationSightingId: id,
            operationId: `op-${op}`,
            formationId: `f-${f}`,
            sightingTime: at(hhmm),
            operation: { operationId: `op-${op}`, operationNumber: op },
            formation: { formationId: `f-${f}`, formationNumber: f },
        }) as never;
    const seg = (
        id: string,
        operationNumber: string,
        startSeconds: number,
        endSeconds: number,
        next: string | null,
    ) => ({
        id,
        operationNumber,
        tripId: id,
        tripBlockId: `b-${id}`,
        operationId: `op-${operationNumber}`,
        startStationId: 'X',
        endStationId: 'Y',
        startSeconds,
        endSeconds,
        nextTripOperationListId: next,
    });
    const itineraries = [
        seg('k11', '11K', 6 * 3600, 8 * 3600 + 22 * 60, 'k12'),
        seg('k12', '12K', 8 * 3600 + 30 * 60, 20 * 3600, null),
    ];
    const direct = [sighting('a', '11K', '10701', '07:00')];

    beforeEach(async () => {
        vi.clearAllMocks();
        service = await buildService();
        mockOperationSightingQuery.findManyBySpecificPeriod.mockResolvedValue(
            direct,
        );
        mockOperationSightingQuery.findManyBySightingTimeRange.mockResolvedValue(
            direct,
        );
        mockCalendarQuery.findOneBySpecificDate.mockResolvedValue({
            id: 'cal-1',
        });
        mockItinerarySegmentQuery.findManyByCalendarId.mockResolvedValue(
            itineraries,
        );
        mockOperationQuery.findManyByCalendarId.mockResolvedValue([
            { operationId: 'op-11K', operationNumber: '11K' },
            { operationId: 'op-12K', operationNumber: '12K' },
        ]);
    });

    it('fields があれば作った一覧を削り、引き継いだ目撃の印は全項目で残す', async () => {
        const result = (await service.findManyBySpecificPeriod({
            start: '2026-10-12',
            end: '2026-10-12',
            includeCarriedOver: true,
            fields: { operationSighting: 'sightingTime' },
        })) as Record<string, unknown>[];

        const carried = result.find((o) => o.sightedAsOperation);
        expect(carried).toEqual({
            id: expect.any(String),
            sightingTime: expect.any(Date),
            sightedAsOperation: {
                operationId: 'op-11K',
                operationNumber: '11K',
            },
        });
        expect(result.find((o) => o.id === 'a')).toEqual({
            id: 'a',
            sightingTime: at('07:00'),
        });
    });

    it('fields[operationSighting] で carriedFromSightingId を選べる（写しにだけ付く）', async () => {
        const result = (await service.findManyBySpecificPeriod({
            start: '2026-10-12',
            end: '2026-10-12',
            includeCarriedOver: true,
            fields: { operationSighting: 'carriedFromSightingId' },
        })) as Record<string, unknown>[];

        expect(result.find((o) => o.id === 'a#12K')).toEqual({
            id: 'a#12K',
            carriedFromSightingId: 'a',
            sightedAsOperation: {
                operationId: 'op-11K',
                operationNumber: '11K',
            },
        });
        expect(result.find((o) => o.id === 'a')).toEqual({ id: 'a' });
    });

    it('fields だけでも無効化の印は ID だけで残り、無効化の無い目撃には invalidation が付かない', async () => {
        const invalidated = {
            ...(sighting('a', '11K', '10701', '07:00') as object),
            invalidation: {
                operationSightingInvalidationId: 'inv-1',
                operationSightingId: 'a',
                createdAt: at('08:00'),
                updatedAt: at('08:00'),
            },
        } as never;
        mockOperationSightingQuery.findManyBySpecificPeriod.mockResolvedValue([
            invalidated,
            sighting('b', '12K', '10702', '09:00'),
        ]);
        const result = (await service.findManyBySpecificPeriod({
            start: '2026-10-12',
            end: '2026-10-12',
            includeInvalidated: true,
            fields: { operationSighting: 'sightingTime' },
        })) as Record<string, unknown>[];

        expect(result).toEqual([
            {
                id: 'a',
                sightingTime: at('07:00'),
                invalidation: { operationSightingInvalidationId: 'inv-1' },
            },
            { id: 'b', sightingTime: at('09:00') },
        ]);
        expect(result[1]).not.toHaveProperty('invalidation');
    });

    it('include に木に無い道筋があれば、問い合わせる前に 400', async () => {
        await expect(
            service.findManyBySpecificPeriod({
                start: '2026-10-12',
                end: '2026-10-12',
                include: 'trips',
            }),
        ).rejects.toThrow(BadRequestException);
        expect(
            mockOperationSightingQuery.findManyBySpecificPeriod,
        ).not.toHaveBeenCalled();
    });

    it('指定しないときは今と同じ応答で、引き継ぎの材料を引かない', async () => {
        const result = await service.findManyBySpecificPeriod({
            start: '2026-10-12',
            end: '2026-10-12',
        });
        expect(result).toBe(direct);
        expect(
            mockOperationSightingQuery.findManyBySightingTimeRange,
        ).not.toHaveBeenCalled();
        expect(
            mockItinerarySegmentQuery.findManyByCalendarId,
        ).not.toHaveBeenCalled();
    });

    it('指定すると引き継いだ目撃が足され、目撃時刻の古い順になる', async () => {
        mockOperationSightingQuery.findManyBySpecificPeriod.mockResolvedValue([
            sighting('a', '11K', '10701', '07:00'),
            sighting('z', '99X', '10999', '12:00'),
        ]);
        const result = await service.findManyBySpecificPeriod({
            start: '2026-10-12',
            end: '2026-10-12',
            includeCarriedOver: true,
        });
        expect(result.map((o) => o.id)).toEqual(['a', 'a#12K', 'z']);
        expect(result[1].sightedAsOperation).toEqual({
            operationId: 'op-11K',
            operationNumber: '11K',
        });
        expect(result[0].sightedAsOperation).toBeUndefined();
        expect(result[1].carriedFromSightingId).toBe('a');
        expect(result[0].carriedFromSightingId).toBeUndefined();
        expect(result[2].carriedFromSightingId).toBeUndefined();
        const range =
            mockOperationSightingQuery.findManyBySightingTimeRange.mock
                .calls[0][0];
        expect(dayjs(range.start).format('YYYY-MM-DD HH:mm')).toBe(
            '2026-10-12 04:00',
        );
        expect(dayjs(range.end).format('YYYY-MM-DD HH:mm')).toBe(
            '2026-10-13 04:00',
        );
    });

    it('同じ行程の中は受け持つ順に並ぶ（12K の目撃から作った 11K が前）', async () => {
        // 直接の一覧は運用を join しないので、運番は operationId から引く
        const d = {
            ...(sighting('a', '12K', '10701', '07:00') as object),
            operation: undefined,
        } as never;
        mockOperationSightingQuery.findManyBySpecificPeriod.mockResolvedValue([
            d,
        ]);
        mockOperationSightingQuery.findManyBySightingTimeRange.mockResolvedValue(
            [sighting('a', '12K', '10701', '07:00')],
        );
        const result = await service.findManyBySpecificPeriod({
            start: '2026-10-12',
            end: '2026-10-12',
            includeCarriedOver: true,
        });
        expect(result.map((o) => o.id)).toEqual(['a#11K', 'a']);
    });

    it('行程をまたぐときは、その行程で最初に目撃された時刻の順に並ぶ（枠の始まりで逆転させない）', async () => {
        // 行程 I の 05K（05:00〜）で 06:00、行程 J の 12K（04:50〜）で 14:00。休車 100 は 10:00
        mockItinerarySegmentQuery.findManyByCalendarId.mockResolvedValue([
            seg('i05', '05K', 5 * 3600, 10 * 3600, null),
            seg('j12', '12K', 4 * 3600 + 50 * 60, 20 * 3600, null),
        ]);
        mockOperationQuery.findManyByCalendarId.mockResolvedValue([
            { operationId: 'op-05K', operationNumber: '05K' },
            { operationId: 'op-12K', operationNumber: '12K' },
            { operationId: 'op-100', operationNumber: '100' },
        ]);
        const s = [
            sighting('b', '12K', '10701', '14:00'),
            sighting('r', '100', '10701', '10:00'),
            sighting('a', '05K', '10701', '06:00'),
        ];
        mockOperationSightingQuery.findManyBySpecificPeriod.mockResolvedValue(
            s,
        );
        mockOperationSightingQuery.findManyBySightingTimeRange.mockResolvedValue(
            s,
        );
        const result = await service.findManyBySpecificPeriod({
            start: '2026-10-12',
            end: '2026-10-12',
            includeCarriedOver: true,
        });
        expect(result.map((o) => o.id)).toEqual(['a', 'r', 'b']);
    });

    it('無効化も表示するときは、無効化された目撃も材料に含めて流れを組む', async () => {
        const invalidated = {
            ...(sighting('a', '11K', '10701', '07:00') as object),
            invalidation: { id: 'inv-1' },
        } as never;
        mockOperationSightingQuery.findManyBySpecificPeriod.mockResolvedValue([
            invalidated,
        ]);
        mockOperationSightingQuery.findManyBySightingTimeRange.mockResolvedValue(
            [invalidated],
        );
        const result = await service.findManyBySpecificPeriod({
            start: '2026-10-12',
            end: '2026-10-12',
            includeInvalidated: true,
            includeCarriedOver: true,
        });
        expect(
            mockOperationSightingQuery.findManyBySightingTimeRange.mock
                .calls[0][0].includeInvalidated,
        ).toBe(true);
        expect(result.map((o) => o.id)).toEqual(['a', 'a#12K']);
        // 無効化された目撃から推した運用は、元と同じく無効化の印を持つ（赤枠で出る）
        expect(result[1].invalidation).toEqual({ id: 'inv-1' });
    });

    it('無効化を表示しないときは、材料も有効な目撃だけにする', async () => {
        await service.findManyBySpecificPeriod({
            start: '2026-10-12',
            end: '2026-10-12',
            includeCarriedOver: true,
        });
        expect(
            mockOperationSightingQuery.findManyBySightingTimeRange.mock
                .calls[0][0].includeInvalidated,
        ).toBe(false);
    });

    it('期間にダイヤ改正日をはさむと、日ごとにその日のカレンダーの行程表で推測する', async () => {
        // 改正前（cal-old）は 11K → 12K、改正後（cal-new）は 11K → 13K
        const onDay = (s: object, date: string) =>
            ({
                ...s,
                sightingTime: dayjs(
                    `${date} ${dayjs((s as { sightingTime: Date }).sightingTime).format('HH:mm')}`,
                ).toDate(),
            }) as never;
        const before = onDay(
            sighting('a', '11K', '10701', '07:00') as object,
            '2026-10-12',
        );
        const after = onDay(
            sighting('b', '11K', '10702', '07:00') as object,
            '2026-10-13',
        );
        mockOperationSightingQuery.findManyBySpecificPeriod.mockResolvedValue([
            before,
            after,
        ]);
        mockOperationSightingQuery.findManyBySightingTimeRange.mockResolvedValue(
            [after, before],
        );
        mockCalendarQuery.findOneBySpecificDate.mockImplementation(
            async ({ date }: { date: string }) => ({
                id: date < '2026-10-13' ? 'cal-old' : 'cal-new',
            }),
        );
        mockItinerarySegmentQuery.findManyByCalendarId.mockImplementation(
            async ({ calendarId }: { calendarId: string }) =>
                calendarId === 'cal-old'
                    ? itineraries
                    : [
                          seg(
                              'n11',
                              '11K',
                              6 * 3600,
                              8 * 3600 + 22 * 60,
                              'n13',
                          ),
                          seg(
                              'n13',
                              '13K',
                              8 * 3600 + 30 * 60,
                              20 * 3600,
                              null,
                          ),
                      ],
        );
        mockOperationQuery.findManyByCalendarId.mockImplementation(
            async ({ calendarId }: { calendarId: string }) =>
                calendarId === 'cal-old'
                    ? [
                          { operationId: 'op-11K', operationNumber: '11K' },
                          { operationId: 'op-12K', operationNumber: '12K' },
                      ]
                    : [
                          { operationId: 'op-11K', operationNumber: '11K' },
                          { operationId: 'op-13K', operationNumber: '13K' },
                      ],
        );
        const result = await service.findManyBySpecificPeriod({
            start: '2026-10-12',
            end: '2026-10-13',
            includeCarriedOver: true,
        });
        expect(result.map((o) => o.id)).toEqual(['a', 'a#12K', 'b', 'b#13K']);
        expect(
            mockItinerarySegmentQuery.findManyByCalendarId,
        ).toHaveBeenCalledTimes(2);
    });

    it('同じカレンダーの行程表と運用は 1 回だけ引く', async () => {
        await service.findManyBySpecificPeriod({
            start: '2026-10-12',
            end: '2026-10-13',
            includeCarriedOver: true,
        });
        expect(
            mockItinerarySegmentQuery.findManyByCalendarId,
        ).toHaveBeenCalledTimes(1);
        expect(mockOperationQuery.findManyByCalendarId).toHaveBeenCalledTimes(
            1,
        );
    });
});

describe('OperationSightingV3ListService - 投稿者ごとの一覧・投稿者・新着', () => {
    let service: OperationSightingV3ListService;

    const sightingRow = {
        operationSightingId: 's-1',
        sightingTime: new Date('2026-11-02T01:00:00.000Z'),
        createdAt: new Date('2026-11-02T01:05:00.000Z'),
        operationNumber: '41',
        formationNumber: '8701',
        invalidated: false,
        invalidatedByUserId: null,
        invalidatedByUsername: null,
    };

    beforeEach(async () => {
        vi.clearAllMocks();
        service = await buildService();
    });

    it('投稿者の目撃は日時を ISO にし、無効化した人を入れ子で返す', async () => {
        mockAuthorQuery.findManyByUserId.mockResolvedValue([
            {
                ...sightingRow,
                invalidated: true,
                invalidatedByUserId: 'e-1',
                invalidatedByUsername: 'editor',
            },
            sightingRow,
        ]);
        const result = await service.findManyByUserId({
            userId: 'u-1',
            limit: 100,
        });
        expect(result[0]).toEqual({
            operationSightingId: 's-1',
            sightingTime: '2026-11-02T01:00:00.000Z',
            createdAt: '2026-11-02T01:05:00.000Z',
            operationNumber: '41',
            formationNumber: '8701',
            invalidated: true,
            invalidatedBy: { userId: 'e-1', username: 'editor' },
        });
        expect(result[1].invalidatedBy).toBeNull();
        expect(mockAuthorQuery.findManyByUserId).toHaveBeenCalledWith({
            userId: 'u-1',
            limit: 100,
            before: null,
        });
    });

    it('before は Date にして query に渡す', async () => {
        mockAuthorQuery.findManyByUserId.mockResolvedValue([]);
        await service.findManyByUserId({
            userId: 'u-1',
            limit: 10,
            before: '2026-11-01T00:00:00.000Z',
        });
        expect(mockAuthorQuery.findManyByUserId).toHaveBeenCalledWith({
            userId: 'u-1',
            limit: 10,
            before: new Date('2026-11-01T00:00:00.000Z'),
        });
    });

    it('目撃の投稿者が無ければ userId: null', async () => {
        mockAuthorQuery.findAuthorUserId.mockResolvedValue(null);
        expect(
            await service.findAuthor({ operationSightingId: 's-1' }),
        ).toEqual({ userId: null });
    });

    it('新着はゲストの目撃の author が null、登録者は事実から判定した印つき', async () => {
        mockAuthorQuery.findManyRecent.mockResolvedValue([
            { ...sightingRow, author: null },
            {
                ...sightingRow,
                operationSightingId: 's-2',
                author: {
                    userId: 'u-1',
                    username: 'alice',
                    displayName: 'Alice',
                    role: 'reporter',
                    // 目撃（2026-11-02T01:05）の 1 時間前に登録 → newAccount
                    registeredAt: new Date('2026-11-02T00:05:00.000Z'),
                    recentPostCount: 4,
                },
            },
        ]);
        const result = await service.findManyRecent({ limit: 100 });
        expect(mockAuthorQuery.findManyRecent).toHaveBeenCalledWith({
            limit: 100,
            before: null,
            // 窓の長さは read model が持ち、usecase が query に渡す
            burstWindowMinutes: 60,
        });
        expect(result[0].author).toBeNull();
        expect(result[1].author).toEqual({
            userId: 'u-1',
            username: 'alice',
            displayName: 'Alice',
            role: 'reporter',
            newAccount: true,
            burst: false,
        });
    });

    it('新着の editor は連投しても印が付かない', async () => {
        mockAuthorQuery.findManyRecent.mockResolvedValue([
            {
                ...sightingRow,
                author: {
                    userId: 'u-3',
                    username: 'carol',
                    displayName: 'Carol',
                    role: 'editor',
                    registeredAt: new Date('2026-11-02T01:00:00.000Z'),
                    recentPostCount: 30,
                },
            },
        ]);
        const [row] = await service.findManyRecent({});
        expect(row.author).toMatchObject({ newAccount: false, burst: false });
    });
});

describe('OperationSightingV3ListService - 本人の目撃と裏付け', () => {
    let service: OperationSightingV3ListService;

    const row = (id: string, operationNumber = '41') => ({
        operationSightingId: id,
        sightingTime: new Date('2026-11-02T01:00:00.000Z'),
        createdAt: new Date('2026-11-02T01:05:00.000Z'),
        operationNumber,
        formationNumber: '8701',
        invalidated: false,
        invalidatedByUserId: null,
        invalidatedByUsername: null,
    });
    const facts = (
        id: string,
        over: {
            operationNumber?: string;
            invalidated?: boolean;
            otherOperationNumbers?: string[];
        } = {},
    ) => ({
        operationSightingId: id,
        operationNumber: '41',
        invalidated: false,
        otherOperationNumbers: [],
        ...over,
    });

    beforeEach(async () => {
        vi.clearAllMocks();
        service = await buildService();
    });

    it('一覧の id で裏付けの材料を 1 回だけ引き、各行に corroboration を付ける', async () => {
        mockAuthorQuery.findManyByUserId.mockResolvedValue([
            row('s-1'),
            row('s-2'),
            row('s-3'),
            row('s-4'),
        ]);
        // 材料は一覧と違う順で返ってもよい（id で突き合わせる）
        mockAuthorQuery.findCorroborationFacts.mockResolvedValue([
            facts('s-4', { invalidated: true, otherOperationNumbers: ['41'] }),
            facts('s-3'),
            facts('s-2', { otherOperationNumbers: ['42'] }),
            facts('s-1', { otherOperationNumbers: ['41', '42'] }),
        ]);

        const result = await service.findManyMine({ userId: 'u-1' });

        expect(mockAuthorQuery.findCorroborationFacts).toHaveBeenCalledTimes(1);
        expect(mockAuthorQuery.findCorroborationFacts).toHaveBeenCalledWith({
            userId: 'u-1',
            operationSightingIds: ['s-1', 's-2', 's-3', 's-4'],
        });
        expect(
            result.map((r) => [r.operationSightingId, r.corroboration]),
        ).toEqual([
            ['s-1', 'corroborated'],
            ['s-2', 'conflicting'],
            ['s-3', 'uncorroborated'],
            ['s-4', 'invalidated'],
        ]);
        // 一覧の形は findManyByUserId と同じ（日時は ISO）
        expect(result[0]).toMatchObject({
            sightingTime: '2026-11-02T01:00:00.000Z',
            createdAt: '2026-11-02T01:05:00.000Z',
            operationNumber: '41',
            formationNumber: '8701',
            invalidated: false,
            invalidatedBy: null,
        });
    });

    it('一覧は findManyByUserId と同じ limit の既定・before の扱い', async () => {
        mockAuthorQuery.findManyByUserId.mockResolvedValue([]);
        await service.findManyMine({
            userId: 'u-1',
            limit: 10,
            before: '2026-11-01T00:00:00.000Z',
        });
        await service.findManyMine({ userId: 'u-1' });
        expect(mockAuthorQuery.findManyByUserId).toHaveBeenNthCalledWith(1, {
            userId: 'u-1',
            limit: 10,
            before: new Date('2026-11-01T00:00:00.000Z'),
        });
        expect(mockAuthorQuery.findManyByUserId).toHaveBeenNthCalledWith(2, {
            userId: 'u-1',
            limit: 100,
            before: null,
        });
    });

    it('投稿が 0 件なら [] を返し、材料の query を呼ばない', async () => {
        mockAuthorQuery.findManyByUserId.mockResolvedValue([]);
        expect(await service.findManyMine({ userId: 'u-1' })).toEqual([]);
        expect(mockAuthorQuery.findCorroborationFacts).not.toHaveBeenCalled();
    });

    it('一覧の行に材料が無ければ UnexpectedError（データの不整合）', async () => {
        mockAuthorQuery.findManyByUserId.mockResolvedValue([row('s-1')]);
        mockAuthorQuery.findCorroborationFacts.mockResolvedValue([]);
        await expect(service.findManyMine({ userId: 'u-1' })).rejects.toThrow(
            UnexpectedError,
        );
    });

    it('countCorroborationsByUserId は本人の全投稿（operationSightingIds: null）を数える', async () => {
        mockAuthorQuery.findCorroborationFacts.mockResolvedValue([
            facts('s-1', { otherOperationNumbers: ['41'] }),
            facts('s-2', { otherOperationNumbers: ['41'] }),
            facts('s-3', { otherOperationNumbers: ['42'] }),
            facts('s-4'),
            facts('s-5', { invalidated: true }),
        ]);

        const counts = await service.countCorroborationsByUserId({
            userId: 'u-1',
        });

        expect(mockAuthorQuery.findCorroborationFacts).toHaveBeenCalledTimes(1);
        expect(mockAuthorQuery.findCorroborationFacts).toHaveBeenCalledWith({
            userId: 'u-1',
            operationSightingIds: null,
        });
        expect(counts).toEqual({
            corroborated: 2,
            conflicting: 1,
            uncorroborated: 1,
            invalidated: 1,
        });
    });

    it('0 件なら 4 つとも 0', async () => {
        mockAuthorQuery.findCorroborationFacts.mockResolvedValue([]);
        expect(
            await service.countCorroborationsByUserId({ userId: 'u-1' }),
        ).toEqual({
            corroborated: 0,
            conflicting: 0,
            uncorroborated: 0,
            invalidated: 0,
        });
    });
});
