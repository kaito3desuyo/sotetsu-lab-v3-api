import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TripClassModel } from '../models/trip-class.model';
import { TripClassQuery } from './trip-class.query';

type AnyMock = jest.MockedFunction<(...args: any[]) => any>;

const mockGetMany: AnyMock = jest.fn();

function buildChainableQueryBuilder(): any {
    const qb: any = {};
    for (const method of ['select', 'where', 'orderBy', 'addOrderBy']) {
        qb[method] = jest.fn().mockReturnValue(qb);
    }
    qb.getMany = mockGetMany;
    return qb;
}

let currentQueryBuilder: any;
const mockCreateQueryBuilder: AnyMock = jest.fn();
const mockRepository = {
    createQueryBuilder: mockCreateQueryBuilder,
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
