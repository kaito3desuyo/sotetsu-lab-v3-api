import type { MockedFunction } from 'vitest';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat.js';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OperationModel } from '../models/operation.model.js';
import { UnexpectedError } from '../../../../core/classes/unexpected-error.js';
import { parseSelection } from '../../../../core/utils/selection/parse-selection.js';
import { OPERATION_WITH_TRIPS_SELECTION_TREE } from '../../usecase/operation-with-trips-selection.js';
import { OPERATIONS_BY_PERIOD_SELECTION_TREE } from '../../usecase/operations-by-period-selection.js';
import { OperationQuery } from './operation.query.js';

dayjs.extend(customParseFormat);

type AnyMock = MockedFunction<(...args: any[]) => any>;

const mockGetOne: AnyMock = vi.fn();
const mockGetMany: AnyMock = vi.fn();

function buildChainableQueryBuilder(): any {
    const qb: any = {};
    for (const method of [
        'select',
        'leftJoinAndSelect',
        'where',
        'orderBy',
        'addOrderBy',
    ]) {
        qb[method] = vi.fn().mockReturnValue(qb);
    }
    qb.getOne = mockGetOne;
    qb.getMany = mockGetMany;
    return qb;
}

let currentQueryBuilder: any;
const mockCreateQueryBuilder: AnyMock = vi.fn();
const mockFind: AnyMock = vi.fn();
const mockFindOne: AnyMock = vi.fn();
const mockRepository = {
    createQueryBuilder: mockCreateQueryBuilder,
    find: mockFind,
    findOne: mockFindOne,
};

async function buildQuery(): Promise<OperationQuery> {
    const module: TestingModule = await Test.createTestingModule({
        providers: [
            OperationQuery,
            {
                provide: getRepositoryToken(OperationModel),
                useValue: mockRepository,
            },
        ],
    }).compile();
    return module.get<OperationQuery>(OperationQuery);
}

// 現在位置の計算に要る結合と並び（リポジトリの find を使っていた頃と同じ中身）
function expectCurrentPositionJoinsAndOrder(): void {
    expect(mockCreateQueryBuilder).toHaveBeenCalledWith('operation');
    expect(currentQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'operation.tripOperationLists',
        'tripOperationLists',
    );
    expect(currentQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'tripOperationLists.trip',
        'trip',
    );
    expect(currentQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'tripOperationLists.startTime',
        'startTime',
    );
    expect(currentQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'tripOperationLists.endTime',
        'endTime',
    );
    expect(currentQueryBuilder.orderBy).toHaveBeenCalledWith(
        'startTime.departureDays',
        'ASC',
        'NULLS LAST',
    );
    expect(currentQueryBuilder.addOrderBy.mock.calls).toEqual([
        ['startTime.departureTime', 'ASC', 'NULLS LAST'],
        ['endTime.arrivalDays', 'ASC', 'NULLS LAST'],
        ['endTime.arrivalTime', 'ASC', 'NULLS LAST'],
    ]);
    // find 系は relations 付きだと DISTINCT の問い合わせが余分に走るので使わない
    expect(mockFind).not.toHaveBeenCalled();
    expect(mockFindOne).not.toHaveBeenCalled();
}

const operationWithoutTrips = {
    id: 'op-1',
    calendarId: 'cal-1',
    operationNumber: '100',
    tripOperationLists: [],
};

describe('OperationQuery - findOneWithCurrentPosition', () => {
    let query: OperationQuery;

    beforeEach(async () => {
        vi.clearAllMocks();
        currentQueryBuilder = buildChainableQueryBuilder();
        mockCreateQueryBuilder.mockReturnValue(currentQueryBuilder);
        query = await buildQuery();
    });

    it('クエリビルダーで列車と時刻を結合し、時刻順に 1 件引く', async () => {
        mockGetOne.mockResolvedValue(null);

        await query.findOneWithCurrentPosition({ operationId: 'op-1' });

        expectCurrentPositionJoinsAndOrder();
        expect(currentQueryBuilder.where).toHaveBeenCalledWith(
            'operation.id = :operationId',
            { operationId: 'op-1' },
        );
    });

    it('運用が無ければ null を返す', async () => {
        mockGetOne.mockResolvedValue(null);

        const result = await query.findOneWithCurrentPosition({
            operationId: 'op-1',
        });

        expect(result).toBeNull();
    });

    it('列車の無い運用は前後・現在とも null で返す', async () => {
        mockGetOne.mockResolvedValue(operationWithoutTrips);

        const result = await query.findOneWithCurrentPosition({
            operationId: 'op-1',
        });

        expect(result?.operation.id).toBe('op-1');
        expect(result?.prev).toBeNull();
        expect(result?.current).toBeNull();
        expect(result?.next).toBeNull();
    });
});

describe('OperationQuery - findManyWithCurrentPosition', () => {
    let query: OperationQuery;

    beforeEach(async () => {
        vi.clearAllMocks();
        currentQueryBuilder = buildChainableQueryBuilder();
        mockCreateQueryBuilder.mockReturnValue(currentQueryBuilder);
        query = await buildQuery();
    });

    it('クエリビルダーで列車と時刻を結合し、運用 ID の一覧でまとめて引く', async () => {
        mockGetMany.mockResolvedValue([]);

        await query.findManyWithCurrentPosition({
            operationIds: ['op-1', 'op-2'],
        });

        expectCurrentPositionJoinsAndOrder();
        expect(currentQueryBuilder.where).toHaveBeenCalledWith(
            'operation.id IN (:...operationIds)',
            { operationIds: ['op-1', 'op-2'] },
        );
    });

    it('運用 ID が空なら問い合わせずに空配列を返す', async () => {
        const result = await query.findManyWithCurrentPosition({
            operationIds: [],
        });

        expect(result).toEqual([]);
        expect(mockCreateQueryBuilder).not.toHaveBeenCalled();
    });

    it('入力の順で返し、見つからない運用は省く', async () => {
        mockGetMany.mockResolvedValue([
            { ...operationWithoutTrips, id: 'op-2' },
            { ...operationWithoutTrips, id: 'op-1' },
        ]);

        const result = await query.findManyWithCurrentPosition({
            operationIds: ['op-1', 'op-missing', 'op-2'],
        });

        expect(result.map((r) => r.operation.id)).toEqual(['op-1', 'op-2']);
    });
});

describe('OperationQuery - 現在位置の計算', () => {
    let query: OperationQuery;

    const tol = (
        id: string,
        start: { days: number; time: string } | undefined,
        end: { days: number; time: string },
    ) => ({
        id,
        startTime: start && {
            departureDays: start.days,
            departureTime: start.time,
        },
        endTime: { arrivalDays: end.days, arrivalTime: end.time },
    });

    beforeEach(async () => {
        vi.clearAllMocks();
        currentQueryBuilder = buildChainableQueryBuilder();
        mockCreateQueryBuilder.mockReturnValue(currentQueryBuilder);
        query = await buildQuery();
    });

    it('列車の出発から到着までの間なら、その列車を current に入れる', async () => {
        mockGetOne.mockResolvedValue({
            ...operationWithoutTrips,
            tripOperationLists: [
                tol(
                    't1',
                    { days: 1, time: '10:00:00' },
                    { days: 1, time: '11:00:00' },
                ),
                tol(
                    't2',
                    { days: 1, time: '12:00:00' },
                    { days: 1, time: '13:00:00' },
                ),
            ],
        });

        const result = await query.findOneWithCurrentPosition({
            operationId: 'op-1',
            searchTime: '2026-10-21T10:30:00+09:00',
        });

        expect(result?.current?.id).toBe('t1');
        expect(result?.prev).toBeNull();
        expect(result?.next).toBeNull();
    });

    it('出発の時刻（startTime）が結合できない列車があれば UnexpectedError', async () => {
        mockGetOne.mockResolvedValue({
            ...operationWithoutTrips,
            tripOperationLists: [
                tol('t1', undefined, { days: 1, time: '11:00:00' }),
            ],
        });

        await expect(
            query.findOneWithCurrentPosition({
                operationId: 'op-1',
                searchTime: '2026-10-21T10:30:00+09:00',
            }),
        ).rejects.toThrow(UnexpectedError);
    });
});

describe('OperationQuery - findManyWithTripsWithSelection', () => {
    let qb: any;
    let query: OperationQuery;

    const select = (raw: { include?: unknown; fields?: unknown }) =>
        parseSelection(raw, OPERATION_WITH_TRIPS_SELECTION_TREE)!;

    beforeEach(async () => {
        qb = {};
        for (const method of [
            'select',
            'addSelect',
            'leftJoin',
            'where',
            'orderBy',
            'addOrderBy',
        ]) {
            qb[method] = vi.fn().mockReturnValue(qb);
        }
        qb.getMany = vi.fn().mockResolvedValue([
            {
                id: 'op1',
                operationNumber: '54',
                calendarId: 'c1',
                tripOperationLists: [
                    {
                        id: 'tol1',
                        tripId: 't1',
                        nextTripOperationListId: null,
                        trip: { id: 't1', tripNumber: '6000', depotOut: true },
                        startTime: {
                            id: 'tm1',
                            stationId: 's1',
                            departureTime: '04:39:00',
                            arrivalTime: null,
                        },
                    },
                ],
            },
        ]);
        mockCreateQueryBuilder.mockReturnValue(qb);
        query = await buildQuery();
    });

    afterEach(() => vi.clearAllMocks());

    it('運用だけ（空の include）なら区間を結合せず、並べ替えもしない', async () => {
        const result = await query.findManyWithTripsWithSelection(
            { calendarId: 'c1' },
            select({ include: '', fields: { operation: 'operationNumber' } }),
        );

        expect(qb.select).toHaveBeenCalledWith([
            'operation.id',
            'operation.operationNumber',
        ]);
        expect(qb.where).toHaveBeenCalledWith(
            'operation.calendar_id = :calendarId',
            { calendarId: 'c1' },
        );
        expect(qb.leftJoin).not.toHaveBeenCalled();
        expect(qb.orderBy).not.toHaveBeenCalled();
        expect(result).toEqual([
            { operation: { id: 'op1', operationNumber: '54' } },
        ]);
    });

    it('時刻を返さなくても、区間は今と同じ出発 → 到着の時刻順', async () => {
        await query.findManyWithTripsWithSelection(
            { calendarId: 'c1' },
            select({ include: 'trips' }),
        );

        expect(qb.leftJoin).toHaveBeenCalledWith(
            'operation.tripOperationLists',
            'tripOperationLists',
        );
        expect(qb.leftJoin).toHaveBeenCalledWith(
            'tripOperationLists.startTime',
            'startTime',
        );
        expect(qb.leftJoin).toHaveBeenCalledWith(
            'tripOperationLists.endTime',
            'endTime',
        );
        expect(qb.orderBy).toHaveBeenCalledWith(
            'startTime.departureDays',
            'ASC',
            'NULLS LAST',
        );
        expect(qb.addOrderBy).toHaveBeenCalledWith(
            'startTime.departureTime',
            'ASC',
            'NULLS LAST',
        );
        expect(qb.addOrderBy).toHaveBeenCalledWith(
            'endTime.arrivalDays',
            'ASC',
            'NULLS LAST',
        );
        expect(qb.addOrderBy).toHaveBeenCalledWith(
            'endTime.arrivalTime',
            'ASC',
            'NULLS LAST',
        );
        // 時刻の列は選ばない
        expect(qb.addSelect).not.toHaveBeenCalledWith(
            expect.arrayContaining(['startTime.id']),
        );
        expect(qb.leftJoin).not.toHaveBeenCalledWith(
            'tripOperationLists.trip',
            'trip',
        );
    });

    it('列車と出発の時刻を挙げれば、指定の列だけで返す', async () => {
        const result = await query.findManyWithTripsWithSelection(
            { calendarId: 'c1' },
            select({
                include: 'trips.trip,trips.startTime',
                fields: {
                    operation: 'operationNumber',
                    tripOperationList: 'tripId',
                    trip: 'tripNumber,depotOut',
                    time: 'stationId,departureTime',
                },
            }),
        );

        expect(qb.addSelect).toHaveBeenCalledWith([
            'tripOperationLists.id',
            'tripOperationLists.tripId',
        ]);
        expect(qb.leftJoin).toHaveBeenCalledWith(
            'tripOperationLists.trip',
            'trip',
        );
        expect(qb.addSelect).toHaveBeenCalledWith([
            'trip.id',
            'trip.tripNumber',
            'trip.depotOut',
        ]);
        expect(qb.addSelect).toHaveBeenCalledWith([
            'startTime.id',
            'startTime.stationId',
            'startTime.departureTime',
        ]);
        expect(qb.leftJoin).not.toHaveBeenCalledWith(
            'trip.tripClass',
            'tripClass',
        );
        expect(result).toEqual([
            {
                operation: { id: 'op1', operationNumber: '54' },
                trips: [
                    {
                        id: 'tol1',
                        tripId: 't1',
                        trip: { id: 't1', tripNumber: '6000', depotOut: true },
                        startTime: {
                            id: 'tm1',
                            stationId: 's1',
                            departureTime: '04:39:00',
                        },
                    },
                ],
            },
        ]);
    });

    it('ダイヤと種別を挙げればそれぞれ結合する', async () => {
        await query.findManyWithTripsWithSelection(
            { calendarId: 'c1' },
            select({ include: 'operation.calendar,trips.trip.tripClass' }),
        );

        expect(qb.leftJoin).toHaveBeenCalledWith(
            'operation.calendar',
            'calendar',
        );
        expect(qb.leftJoin).toHaveBeenCalledWith('trip.tripClass', 'tripClass');
    });
});

describe('OperationQuery - findManyBySpecificPeriodWithSelection', () => {
    let qb: any;
    let query: OperationQuery;

    beforeEach(async () => {
        qb = {};
        for (const method of [
            'select',
            'addSelect',
            'leftJoin',
            'where',
            'andWhere',
        ]) {
            qb[method] = vi.fn().mockReturnValue(qb);
        }
        qb.getMany = vi.fn().mockResolvedValue([
            {
                id: 'op1',
                operationNumber: '54',
                calendar: { id: 'c1', calendarName: '平日' },
            },
        ]);
        mockCreateQueryBuilder.mockReturnValue(qb);
        query = await buildQuery();
    });

    afterEach(() => vi.clearAllMocks());

    it('ダイヤを返さないときも、期間の絞り込みのため結合だけはする', async () => {
        const result = await query.findManyBySpecificPeriodWithSelection(
            { start: '2026-10-24', end: '2026-10-24' },
            parseSelection(
                { fields: { operation: 'operationNumber' } },
                OPERATIONS_BY_PERIOD_SELECTION_TREE,
            )!,
        );

        expect(qb.select).toHaveBeenCalledWith([
            'operation.id',
            'operation.operationNumber',
        ]);
        expect(qb.leftJoin).toHaveBeenCalledWith(
            'operation.calendar',
            'calendar',
        );
        expect(qb.addSelect).not.toHaveBeenCalled();
        expect(qb.where).toHaveBeenCalledWith(
            '(calendar.start_date <= :endDate OR calendar.start_date IS NULL)',
            { endDate: '2026-10-24' },
        );
        expect(qb.andWhere).toHaveBeenCalledWith(
            '(calendar.end_date >= :startDate OR calendar.end_date IS NULL)',
            { startDate: '2026-10-24' },
        );
        expect(result).toEqual([{ id: 'op1', operationNumber: '54' }]);
    });

    it('include=calendar ならダイヤの列も選んで返す', async () => {
        const result = await query.findManyBySpecificPeriodWithSelection(
            { start: '2026-10-24', end: '2026-10-24' },
            parseSelection(
                {
                    include: 'calendar',
                    fields: {
                        operation: 'operationNumber',
                        calendar: 'calendarName',
                    },
                },
                OPERATIONS_BY_PERIOD_SELECTION_TREE,
            )!,
        );

        expect(qb.addSelect).toHaveBeenCalledWith([
            'calendar.id',
            'calendar.calendarName',
        ]);
        expect(result).toEqual([
            {
                id: 'op1',
                operationNumber: '54',
                calendar: { id: 'c1', calendarName: '平日' },
            },
        ]);
    });
});

describe('OperationQuery - findOneWithTripsWithSelection', () => {
    let qb: any;
    let query: OperationQuery;

    beforeEach(async () => {
        qb = {};
        for (const method of [
            'select',
            'addSelect',
            'leftJoin',
            'where',
            'orderBy',
            'addOrderBy',
        ]) {
            qb[method] = vi.fn().mockReturnValue(qb);
        }
        qb.getOne = vi.fn();
        mockCreateQueryBuilder.mockReturnValue(qb);
        query = await buildQuery();
    });

    afterEach(() => vi.clearAllMocks());

    it('運用 1 件を、運用表の trips と同じ形で返す', async () => {
        qb.getOne.mockResolvedValue({
            id: 'op1',
            operationNumber: '54',
            tripOperationLists: [{ id: 'tol1', tripId: 't1' }],
        });

        const result = await query.findOneWithTripsWithSelection(
            { operationId: 'op1' },
            parseSelection(
                {
                    include: 'trips',
                    fields: {
                        operation: 'operationNumber',
                        tripOperationList: 'tripId',
                    },
                },
                OPERATION_WITH_TRIPS_SELECTION_TREE,
            )!,
        );

        expect(qb.where).toHaveBeenCalledWith('operation.id = :operationId', {
            operationId: 'op1',
        });
        expect(qb.orderBy).toHaveBeenCalledWith(
            'startTime.departureDays',
            'ASC',
            'NULLS LAST',
        );
        expect(result).toEqual({
            operation: { id: 'op1', operationNumber: '54' },
            trips: [{ id: 'tol1', tripId: 't1' }],
        });
    });

    it('見つからなければ null', async () => {
        qb.getOne.mockResolvedValue(null);

        const result = await query.findOneWithTripsWithSelection(
            { operationId: 'none' },
            parseSelection(
                { include: '' },
                OPERATION_WITH_TRIPS_SELECTION_TREE,
            )!,
        );

        expect(result).toBeNull();
    });
});
