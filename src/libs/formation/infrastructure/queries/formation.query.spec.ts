import type { MockedFunction } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat.js';
import { FormationModel } from '../models/formation.model.js';
import { FormationQuery } from './formation.query.js';

dayjs.extend(customParseFormat);

type AnyMock = MockedFunction<(...args: any[]) => any>;

const mockGetMany: AnyMock = vi.fn();

function buildChainableQueryBuilder(): any {
    const qb: any = {};
    for (const method of [
        'select',
        'leftJoinAndSelect',
        'where',
        'andWhere',
        'orderBy',
        'addOrderBy',
    ]) {
        qb[method] = vi.fn().mockReturnValue(qb);
    }
    qb.getMany = mockGetMany;
    return qb;
}

let currentQueryBuilder: any;
const mockCreateQueryBuilder: AnyMock = vi.fn();
const mockRepository = {
    createQueryBuilder: mockCreateQueryBuilder,
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
        vi.clearAllMocks();
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
