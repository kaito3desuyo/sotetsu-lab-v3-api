import type { MockedFunction } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { FormationQuery } from '../infrastructure/queries/formation.query.js';
import { FormationDetailsDto } from './dtos/formation-details.dto.js';
import { FormationV3Service } from './formation.v3.service.js';
import { FormationFindManyBySpecificPeriodParam } from './params/formation-find-many-by-specific-period.param.js';

type AnyMock = MockedFunction<(...args: any[]) => any>;

const mockFormationQuery = {
    findManyBySpecificPeriod: vi.fn() as AnyMock,
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

            expect(mockFormationQuery.findManyBySpecificPeriod).toHaveBeenCalledWith(params);
            expect(result).toBe(expected);
        });
    });
});
