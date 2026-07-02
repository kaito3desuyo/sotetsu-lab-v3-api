import { Test, TestingModule } from '@nestjs/testing';
import { OperationQuery } from '../infrastructure/queries/operation.query';
import { OperationCurrentPositionDto } from './dtos/operation-current-position.dto';
import { OperationDetailsDto } from './dtos/operation-details.dto';
import { OperationV3Service } from './operation.v3.service';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyMock = jest.MockedFunction<(...args: any[]) => any>;

const mockOperationQuery = {
    findManyByCalendarId: jest.fn() as AnyMock,
    findManyBySpecificPeriod: jest.fn() as AnyMock,
    findOneWithCurrentPosition: jest.fn() as AnyMock,
};

async function buildService(): Promise<OperationV3Service> {
    const module: TestingModule = await Test.createTestingModule({
        providers: [
            OperationV3Service,
            { provide: OperationQuery, useValue: mockOperationQuery },
        ],
    }).compile();

    return module.get<OperationV3Service>(OperationV3Service);
}

describe('OperationV3Service', () => {
    let service: OperationV3Service;

    beforeEach(async () => {
        jest.clearAllMocks();
        service = await buildService();
    });

    describe('findManyByCalendarId', () => {
        it('calendarId を OperationQuery に渡してそのまま返す', async () => {
            const expected: OperationDetailsDto[] = [
                { operationId: 'op-1' } as OperationDetailsDto,
            ];
            mockOperationQuery.findManyByCalendarId.mockResolvedValue(expected);

            const result = await service.findManyByCalendarId({
                calendarId: 'cal-1',
            });

            expect(mockOperationQuery.findManyByCalendarId).toHaveBeenCalledWith({ calendarId: 'cal-1' });
            expect(result).toBe(expected);
        });
    });

    describe('findManyBySpecificPeriod', () => {
        it('start / end を OperationQuery に渡してそのまま返す', async () => {
            const expected: OperationDetailsDto[] = [
                { operationId: 'op-2' } as OperationDetailsDto,
            ];
            mockOperationQuery.findManyBySpecificPeriod.mockResolvedValue(expected);

            const result = await service.findManyBySpecificPeriod({
                start: '2024-01-01',
                end: '2024-01-31',
            });

            expect(mockOperationQuery.findManyBySpecificPeriod).toHaveBeenCalledWith({
                start: '2024-01-01',
                end: '2024-01-31',
            });
            expect(result).toBe(expected);
        });
    });

    describe('findOneWithCurrentPosition', () => {
        it('operationId と searchTime を OperationQuery に渡してそのまま返す', async () => {
            const expected = {
                operationId: 'op-3',
            } as unknown as OperationCurrentPositionDto;
            mockOperationQuery.findOneWithCurrentPosition.mockResolvedValue(expected);

            const result = await service.findOneWithCurrentPosition({
                operationId: 'op-3',
                searchTime: '12:00:00',
            });

            expect(mockOperationQuery.findOneWithCurrentPosition).toHaveBeenCalledWith({
                operationId: 'op-3',
                searchTime: '12:00:00',
            });
            expect(result).toBe(expected);
        });

        it('searchTime を省略しても OperationQuery に渡す', async () => {
            const expected = {
                operationId: 'op-4',
            } as unknown as OperationCurrentPositionDto;
            mockOperationQuery.findOneWithCurrentPosition.mockResolvedValue(expected);

            const result = await service.findOneWithCurrentPosition({
                operationId: 'op-4',
            });

            expect(mockOperationQuery.findOneWithCurrentPosition).toHaveBeenCalledWith({
                operationId: 'op-4',
                searchTime: undefined,
            });
            expect(result).toBe(expected);
        });
    });
});
