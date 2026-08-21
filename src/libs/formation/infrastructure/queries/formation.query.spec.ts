import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { FormationModel } from '../models/formation.model';
import { FormationQuery } from './formation.query';

dayjs.extend(customParseFormat);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyMock = jest.MockedFunction<(...args: any[]) => any>;

const mockGetMany: AnyMock = jest.fn();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildChainableQueryBuilder(): any {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const qb: any = {};
    for (const method of [
        'select',
        'leftJoinAndSelect',
        'where',
        'andWhere',
        'orderBy',
        'addOrderBy',
    ]) {
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
        targetName: 'FormationModel',
    },
};

async function buildQuery(): Promise<FormationQuery> {
    const module: TestingModule = await Test.createTestingModule({
        providers: [
            FormationQuery,
            {
                provide: getRepositoryToken(FormationModel),
                useValue: mockRepository,
            },
        ],
    }).compile();
    return module.get<FormationQuery>(FormationQuery);
}

describe('FormationQuery - findManyBySpecificPeriod', () => {
    let query: FormationQuery;

    beforeEach(async () => {
        jest.clearAllMocks();
        currentQueryBuilder = buildChainableQueryBuilder();
        mockCreateQueryBuilder.mockReturnValue(currentQueryBuilder);
        mockGetMany.mockResolvedValue([]);
        query = await buildQuery();
    });

    it('車種番号・編成番号の昇順で並べ替えて取得する（リグレッション）', async () => {
        await query.findManyBySpecificPeriod({
            startDate: '2026-08-01',
            endDate: '2026-08-31',
        });

        expect(currentQueryBuilder.orderBy).toHaveBeenCalledWith(
            "to_number(formation.vehicle_type, '9999999999999999')",
            'ASC',
        );
        expect(currentQueryBuilder.addOrderBy).toHaveBeenCalledWith(
            "to_number(formation.formation_number, '9999999999999999')",
            'ASC',
        );
    });

    it('並び順を DB の物理順に委ねない（orderBy が必ず指定される）', async () => {
        await query.findManyBySpecificPeriod({
            startDate: '2026-08-01',
            endDate: '2026-08-31',
        });

        expect(currentQueryBuilder.orderBy).toHaveBeenCalled();
    });
});
