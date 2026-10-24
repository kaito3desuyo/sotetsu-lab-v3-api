import type { MockedFunction } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { FormationQuery } from '../infrastructure/queries/formation.query.js';
import { FormationDetailsDto } from './dtos/formation-details.dto.js';
import { FormationV3Service } from './formation.v3.service.js';
import { FormationFindManyBySpecificPeriodParam } from './params/formation-find-many-by-specific-period.param.js';

type AnyMock = MockedFunction<(...args: any[]) => any>;

const mockFormationQuery = {
    findManyBySpecificDate: vi.fn() as AnyMock,
    findManyBySpecificDateWithSelection: vi.fn() as AnyMock,
    findManyBySpecificPeriod: vi.fn() as AnyMock,
    findManyBySpecificPeriodWithSelection: vi.fn() as AnyMock,
};

async function buildService(): Promise<FormationV3Service> {
    const module: TestingModule = await Test.createTestingModule({
        providers: [
            FormationV3Service,
            { provide: FormationQuery, useValue: mockFormationQuery },
        ],
    }).compile();

    return module.get<FormationV3Service>(FormationV3Service);
}

describe('FormationV3Service', () => {
    let service: FormationV3Service;

    beforeEach(async () => {
        vi.clearAllMocks();
        service = await buildService();
    });

    describe('findManyBySpecificPeriod', () => {
        it('params を FormationQuery に渡してそのまま返す', async () => {
            const params: FormationFindManyBySpecificPeriodParam = {
                startDate: '2024-01-01',
                endDate: '2024-01-31',
            };
            const expected: FormationDetailsDto[] = [
                { formationId: 'f-1' } as FormationDetailsDto,
            ];
            mockFormationQuery.findManyBySpecificPeriod.mockResolvedValue(expected);

            const result = await service.findManyBySpecificPeriod(params);

            expect(
                mockFormationQuery.findManyBySpecificPeriod,
            ).toHaveBeenCalledWith({
                startDate: '2024-01-01',
                endDate: '2024-01-31',
            });
            expect(result).toBe(expected);
        });
    });
});

describe('FormationV3Service - 選択', () => {
    let service: FormationV3Service;

    beforeEach(async () => {
        vi.clearAllMocks();
        service = await buildService();
    });

    it('as/of: 指定が無ければ今の取得', async () => {
        mockFormationQuery.findManyBySpecificDate.mockResolvedValue([]);
        await service.findManyBySpecificDate({ date: '2026-10-24' });
        expect(mockFormationQuery.findManyBySpecificDate).toHaveBeenCalledWith({
            date: '2026-10-24',
        });
        expect(
            mockFormationQuery.findManyBySpecificDateWithSelection,
        ).not.toHaveBeenCalled();
    });

    it('as/of: 指定があれば選んだ取得', async () => {
        mockFormationQuery.findManyBySpecificDateWithSelection.mockResolvedValue(
            [],
        );
        await service.findManyBySpecificDate({
            date: '2026-10-24',
            include: 'vehicleFormations',
        });
        expect(
            mockFormationQuery.findManyBySpecificDateWithSelection,
        ).toHaveBeenCalledWith(
            { date: '2026-10-24' },
            { paths: new Set(['vehicleFormations']), fields: new Map() },
        );
    });

    it('from/to: 木に無い道筋は 400', async () => {
        await expect(
            service.findManyBySpecificPeriod({
                startDate: '2026-10-24',
                endDate: '2026-10-24',
                include: 'vehicleFormations',
            }),
        ).rejects.toThrow(BadRequestException);
    });
});
