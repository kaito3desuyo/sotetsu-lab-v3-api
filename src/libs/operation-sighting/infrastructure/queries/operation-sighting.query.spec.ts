import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OperationSightingModel } from '../models/operation-sighting.model';
import { OperationSightingQuery } from './operation-sighting.query';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyMock = jest.MockedFunction<(...args: any[]) => any>;

const mockGetOne: AnyMock = jest.fn();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildChainableQueryBuilder(): any {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const qb: any = {};
    for (const method of ['leftJoinAndSelect', 'where']) {
        qb[method] = jest.fn().mockReturnValue(qb);
    }
    qb.getOne = mockGetOne;
    return qb;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let currentQueryBuilder: any;
const mockCreateQueryBuilder: AnyMock = jest.fn();
const mockRepository = {
    createQueryBuilder: mockCreateQueryBuilder,
    metadata: {
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
