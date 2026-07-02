import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OperationSightingModel } from '../models/operation-sighting.model';
import { OperationSightingQuery } from './operation-sighting.query';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyMock = jest.MockedFunction<(...args: any[]) => any>;

const mockFindOne: AnyMock = jest.fn();
const mockRepository = {
    findOne: mockFindOne,
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

    beforeAll(async () => {
        query = await buildQuery();
    });

    beforeEach(() => {
        mockFindOne.mockReset();
    });

    it('operation と formation リレーションを含めて findOne を呼ぶ（リグレッション）', async () => {
        mockFindOne.mockResolvedValue(null);

        await query.findOneById({ id: 'test-id' });

        expect(mockFindOne).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: 'test-id' },
                relations: expect.arrayContaining(['operation', 'formation']),
            }),
        );
    });

    it('モデルが存在しない場合は null を返す', async () => {
        mockFindOne.mockResolvedValue(null);

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
        mockFindOne.mockResolvedValue(mockModel);

        const result = await query.findOneById({ id: 'sighting-uuid' });

        expect(result).not.toBeNull();
        expect(result?.operationSightingId).toBe('sighting-uuid');
    });
});
