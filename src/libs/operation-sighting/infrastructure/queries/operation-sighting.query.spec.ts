import { Test, TestingModule } from '@nestjs/testing';
import dayjs from 'dayjs';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OperationSightingModel } from '../models/operation-sighting.model';
import { OperationSightingQuery } from './operation-sighting.query';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyMock = jest.MockedFunction<(...args: any[]) => any>;

const mockGetOne: AnyMock = jest.fn();
const mockGetMany: AnyMock = jest.fn();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildChainableQueryBuilder(): any {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const qb: any = {};
    for (const method of ['leftJoinAndSelect', 'where', 'andWhere', 'orderBy', 'addOrderBy']) {
        qb[method] = jest.fn().mockReturnValue(qb);
    }
    qb.getOne = mockGetOne;
    qb.getMany = mockGetMany;
    return qb;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let currentQueryBuilder: any;
const mockCreateQueryBuilder: AnyMock = jest.fn();
const mockRawQuery: AnyMock = jest.fn();
const mockFind: AnyMock = jest.fn();
const mockRepository = {
    createQueryBuilder: mockCreateQueryBuilder,
    query: mockRawQuery,
    find: mockFind,
    manager: {
        connection: {
            getMetadata: (target: { name: string }) => ({
                tableName: target.name,
            }),
        },
    },
    metadata: {
        tableName: 'operation_sightings',
        connection: { options: { type: 'postgres' } },
        columns: [],
        primaryColumns: [],
        relations: [],
        targetName: 'OperationSightingModel',
    },
};

async function buildQuery(): Promise<OperationSightingQuery> {
    const module: TestingModule = await Test.createTestingModule({
        providers: [
            OperationSightingQuery,
            {
                provide: getRepositoryToken(OperationSightingModel),
                useValue: mockRepository,
            },
        ],
    }).compile();
    return module.get<OperationSightingQuery>(OperationSightingQuery);
}

describe('OperationSightingQuery - findOneById', () => {
    let query: OperationSightingQuery;

    beforeEach(async () => {
        jest.clearAllMocks();
        currentQueryBuilder = buildChainableQueryBuilder();
        mockCreateQueryBuilder.mockReturnValue(currentQueryBuilder);
        mockGetOne.mockResolvedValue(null);
        query = await buildQuery();
    });

    it('operation と formation リレーションを含めて取得する（リグレッション）', async () => {
        await query.findOneById({ id: 'test-id' });

        expect(currentQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
            'sighting.operation',
            'operation',
        );
        expect(currentQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
            'sighting.formation',
            'formation',
        );
        expect(currentQueryBuilder.where).toHaveBeenCalledWith(
            'sighting.id = :id',
            { id: 'test-id' },
        );
    });

    it('モデルが存在しない場合は null を返す', async () => {
        mockGetOne.mockResolvedValue(null);

        const result = await query.findOneById({ id: 'test-id' });

        expect(result).toBeNull();
    });

    it('モデルが存在する場合は operationSightingId にモデルの id が入った DTO を返す', async () => {
        const mockModel: Partial<OperationSightingModel> = {
            id: 'sighting-uuid',
            formationId: 'formation-uuid',
            operationId: 'operation-uuid',
            sightingTime: new Date('2024-01-01T00:00:00Z'),
            invalidations: [],
            managementLogs: [],
        };
        mockGetOne.mockResolvedValue(mockModel);

        const result = await query.findOneById({ id: 'sighting-uuid' });

        expect(result).not.toBeNull();
        expect(result?.operationSightingId).toBe('sighting-uuid');
    });
});

describe('OperationSightingQuery - findManyLatestByOperationNumbersAndBeforeSightingTime', () => {
    let query: OperationSightingQuery;

    beforeEach(async () => {
        jest.clearAllMocks();
        currentQueryBuilder = buildChainableQueryBuilder();
        mockCreateQueryBuilder.mockReturnValue(currentQueryBuilder);
        query = await buildQuery();
    });

    it('番号ごとの最新の ID を引いたあと、本体はクエリビルダーで運用・編成と結合して引く', async () => {
        mockRawQuery.mockResolvedValue([{ id: 's-1' }, { id: 's-2' }]);
        mockGetMany.mockResolvedValue([
            { id: 's-1', operation: { operationNumber: '11' } },
            { id: 's-2', operation: { operationNumber: '51' } },
        ]);

        const result =
            await query.findManyLatestByOperationNumbersAndBeforeSightingTime({
                operationNumbers: ['11', '51'],
                sightingTime: dayjs('2026-10-05T13:00:00+09:00'),
            });

        expect(mockCreateQueryBuilder).toHaveBeenCalledWith('sighting');
        expect(currentQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
            'sighting.operation',
            'operation',
        );
        expect(currentQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
            'sighting.formation',
            'formation',
        );
        expect(currentQueryBuilder.where).toHaveBeenCalledWith(
            'sighting.id IN (:...ids)',
            { ids: ['s-1', 's-2'] },
        );
        expect(mockFind).not.toHaveBeenCalled();
        expect([...result.keys()]).toEqual(['11', '51']);
    });

    it('該当が無ければ本体を引かずに空を返す', async () => {
        mockRawQuery.mockResolvedValue([]);

        const result =
            await query.findManyLatestByOperationNumbersAndBeforeSightingTime({
                operationNumbers: ['11'],
                sightingTime: dayjs('2026-10-05T13:00:00+09:00'),
            });

        expect(result.size).toBe(0);
        expect(mockCreateQueryBuilder).not.toHaveBeenCalled();
    });
});

describe('OperationSightingQuery - findManyBySightingTimeRange', () => {
    let query: OperationSightingQuery;

    beforeEach(async () => {
        jest.clearAllMocks();
        currentQueryBuilder = buildChainableQueryBuilder();
        mockCreateQueryBuilder.mockReturnValue(currentQueryBuilder);
        mockGetMany.mockResolvedValue([]);
        query = await buildQuery();
    });

    it('無効化を NOT EXISTS で除き、運用・編成つきで新しい順に引く', async () => {
        await query.findManyBySightingTimeRange({
            start: dayjs('2026-10-12T04:00:00+09:00'),
            end: dayjs('2026-10-12T09:00:00+09:00'),
        });

        expect(currentQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('sighting.operation', 'operation');
        expect(currentQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('sighting.formation', 'formation');
        expect(currentQueryBuilder.where).toHaveBeenCalledWith(
            'sighting.sightingTime BETWEEN :start AND :end',
            expect.any(Object),
        );
        const subQuery = {
            select: jest.fn().mockReturnThis(),
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            getQuery: jest.fn().mockReturnValue('(SELECT 1)'),
        };
        const callback = currentQueryBuilder.andWhere.mock.calls[0][0];
        expect(callback({ subQuery: () => subQuery })).toBe('NOT EXISTS (SELECT 1)');
        expect(currentQueryBuilder.orderBy).toHaveBeenCalledWith('sighting.sightingTime', 'DESC');
        expect(currentQueryBuilder.addOrderBy).toHaveBeenCalledWith('sighting.updatedAt', 'DESC');
    });

    it('includeInvalidated なら無効化も含め、無効化の情報もつけて引く', async () => {
        await query.findManyBySightingTimeRange({
            start: dayjs('2026-10-12T04:00:00+09:00'),
            end: dayjs('2026-10-12T09:00:00+09:00'),
            includeInvalidated: true,
        });

        expect(currentQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('sighting.invalidations', 'invalidations');
        expect(currentQueryBuilder.andWhere).not.toHaveBeenCalled();
    });
});
