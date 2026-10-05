import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OperationModel } from '../models/operation.model';
import { OperationQuery } from './operation.query';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyMock = jest.MockedFunction<(...args: any[]) => any>;

const mockGetOne: AnyMock = jest.fn();
const mockGetMany: AnyMock = jest.fn();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildChainableQueryBuilder(): any {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const qb: any = {};
    for (const method of [
        'select',
        'leftJoinAndSelect',
        'where',
        'orderBy',
        'addOrderBy',
    ]) {
        qb[method] = jest.fn().mockReturnValue(qb);
    }
    qb.getOne = mockGetOne;
    qb.getMany = mockGetMany;
    return qb;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let currentQueryBuilder: any;
const mockCreateQueryBuilder: AnyMock = jest.fn();
const mockFind: AnyMock = jest.fn();
const mockFindOne: AnyMock = jest.fn();
const mockRepository = {
    createQueryBuilder: mockCreateQueryBuilder,
    find: mockFind,
    findOne: mockFindOne,
    metadata: {
        connection: { options: { type: 'postgres' } },
        columns: [],
        primaryColumns: [],
        relations: [],
        targetName: 'OperationModel',
    },
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
        jest.clearAllMocks();
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

        expect(result.operation.id).toBe('op-1');
        expect(result.prev).toBeNull();
        expect(result.current).toBeNull();
        expect(result.next).toBeNull();
    });
});

describe('OperationQuery - findManyWithCurrentPosition', () => {
    let query: OperationQuery;

    beforeEach(async () => {
        jest.clearAllMocks();
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
