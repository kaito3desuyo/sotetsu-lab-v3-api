import type { MockedFunction } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat.js';
import { parseSelection } from '../../../../core/utils/selection/parse-selection.js';
import {
    FORMATIONS_AS_OF_SELECTION_TREE,
    FORMATIONS_BY_PERIOD_SELECTION_TREE,
} from '../../usecase/formation-selection.js';
import { FormationModel } from '../models/formation.model.js';
import { FormationQuery } from './formation.query.js';

dayjs.extend(customParseFormat);

type AnyMock = MockedFunction<(...args: any[]) => any>;

const mockGetMany: AnyMock = vi.fn();

function buildChainableQueryBuilder(): any {
    const qb: any = {};
    for (const method of [
        'select',
        'addSelect',
        'leftJoin',
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

describe('FormationQuery - 選択の取得', () => {
    let query: FormationQuery;

    beforeEach(async () => {
        vi.clearAllMocks();
        currentQueryBuilder = buildChainableQueryBuilder();
        mockCreateQueryBuilder.mockReturnValue(currentQueryBuilder);
        mockGetMany.mockResolvedValue([
            {
                id: 'f1',
                formationNumber: '10701',
                vehicleFormations: [
                    {
                        id: 'vf1',
                        carNumber: 1,
                        vehicle: { id: 'v1', vehicleNumber: '10701' },
                    },
                ],
                agency: { id: 'a1', agencyName: '相鉄' },
            },
        ]);
        query = await buildQuery();
    });

    it('as/of: 車両を挙げなければ結合せず、並びは今と同じ', async () => {
        const qb = currentQueryBuilder;
        const result = await query.findManyBySpecificDateWithSelection(
            { date: '2026-10-24' },
            parseSelection(
                { include: '', fields: { formation: 'formationNumber' } },
                FORMATIONS_AS_OF_SELECTION_TREE,
            )!,
        );

        expect(qb.select).toHaveBeenCalledWith([
            'formation.id',
            'formation.formationNumber',
        ]);
        expect(qb.leftJoin).not.toHaveBeenCalled();
        expect(qb.orderBy).toHaveBeenCalledWith(
            "to_number(formation.vehicle_type, '9999999999999999')",
            'ASC',
        );
        expect(qb.addOrderBy).toHaveBeenCalledWith(
            "to_number(formation.formation_number, '9999999999999999')",
            'ASC',
        );
        expect(result).toEqual([{ id: 'f1', formationNumber: '10701' }]);
    });

    it('as/of: include=vehicleFormations.vehicle なら号車と車両を結合する', async () => {
        const qb = currentQueryBuilder;
        const result = await query.findManyBySpecificDateWithSelection(
            { date: '2026-10-24' },
            parseSelection(
                {
                    include: 'vehicleFormations.vehicle',
                    fields: {
                        formation: 'formationNumber',
                        vehicleFormation: 'carNumber',
                        vehicle: 'vehicleNumber',
                    },
                },
                FORMATIONS_AS_OF_SELECTION_TREE,
            )!,
        );

        expect(qb.leftJoin).toHaveBeenCalledWith(
            'formation.vehicleFormations',
            'vehicleFormations',
        );
        expect(qb.leftJoin).toHaveBeenCalledWith(
            'vehicleFormations.vehicle',
            'vehicle',
        );
        expect(qb.addSelect).toHaveBeenCalledWith([
            'vehicleFormations.id',
            'vehicleFormations.carNumber',
        ]);
        expect(qb.addSelect).toHaveBeenCalledWith([
            'vehicle.id',
            'vehicle.vehicleNumber',
        ]);
        expect(result).toEqual([
            {
                id: 'f1',
                formationNumber: '10701',
                vehicleFormations: [
                    {
                        id: 'vf1',
                        carNumber: 1,
                        vehicle: { id: 'v1', vehicleNumber: '10701' },
                    },
                ],
            },
        ]);
    });

    it('from/to: include=agency なら事業者を結合する', async () => {
        const qb = currentQueryBuilder;
        const result = await query.findManyBySpecificPeriodWithSelection(
            { startDate: '2026-10-24', endDate: '2026-10-24' },
            parseSelection(
                {
                    include: 'agency',
                    fields: {
                        formation: 'formationNumber',
                        agency: 'agencyName',
                    },
                },
                FORMATIONS_BY_PERIOD_SELECTION_TREE,
            )!,
        );

        expect(qb.leftJoin).toHaveBeenCalledWith('formation.agency', 'agency');
        expect(qb.addSelect).toHaveBeenCalledWith([
            'agency.id',
            'agency.agencyName',
        ]);
        expect(qb.andWhere).toHaveBeenCalledWith(
            '(formation.start_date <= :endDate OR formation.start_date IS NULL)',
            { endDate: '2026-10-24' },
        );
        expect(result).toEqual([
            {
                id: 'f1',
                formationNumber: '10701',
                agency: { id: 'a1', agencyName: '相鉄' },
            },
        ]);
    });
});
