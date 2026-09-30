import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TripClassModel } from '../models/trip-class.model';
import { TripClassQuery } from './trip-class.query';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyMock = jest.MockedFunction<(...args: any[]) => any>;

const mockGetMany: AnyMock = jest.fn();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildChainableQueryBuilder(): any {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const qb: any = {};
    for (const method of ['select', 'where', 'orderBy', 'addOrderBy']) {
        qb[method] = jest.fn().mockReturnValue(qb);
    }
    qb.getMany = mockGetMany;
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
        targetName: 'TripClassModel',
    },
};

async function buildQuery(): Promise<TripClassQuery> {
    const module: TestingModule = await Test.createTestingModule({
        providers: [
            TripClassQuery,
            {
                provide: getRepositoryToken(TripClassModel),
                useValue: mockRepository,
            },
        ],
    }).compile();
    return module.get<TripClassQuery>(TripClassQuery);
}

describe('TripClassQuery - findMany', () => {
    let query: TripClassQuery;

    beforeEach(async () => {
        jest.clearAllMocks();
        currentQueryBuilder = buildChainableQueryBuilder();
        mockCreateQueryBuilder.mockReturnValue(currentQueryBuilder);
        mockGetMany.mockResolvedValue([]);
        query = await buildQuery();
    });

    it('sequence の昇順で並べ替えて取得する（リグレッション）', async () => {
        await query.findMany({ serviceId: 'service-1' });

        expect(currentQueryBuilder.orderBy).toHaveBeenCalledWith(
            'tripClass.sequence',
            'ASC',
        );
    });

    it('serviceId が無くても sequence の昇順で並べる', async () => {
        await query.findMany();

        expect(currentQueryBuilder.where).not.toHaveBeenCalled();
        expect(currentQueryBuilder.orderBy).toHaveBeenCalledWith(
            'tripClass.sequence',
            'ASC',
        );
    });
});
