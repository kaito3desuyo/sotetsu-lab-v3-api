import { Test, TestingModule } from '@nestjs/testing';
import { OperationQuery } from '../infrastructure/queries/operation.query';
import { OperationCurrentPositionDto } from './dtos/operation-current-position.dto';
import { OperationDetailsDto } from './dtos/operation-details.dto';
import { OperationWithTripsDto } from './dtos/operation-with-trips.dto';
import { OperationV3Service } from './operation.v3.service';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyMock = jest.MockedFunction<(...args: any[]) => any>;

const mockOperationQuery = {
    findManyByCalendarId: jest.fn() as AnyMock,
    findManyBySpecificPeriod: jest.fn() as AnyMock,
    findOneWithCurrentPosition: jest.fn() as AnyMock,
    findManyWithTrips: jest.fn() as AnyMock,
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

    describe('findManyWithTrips', () => {
        it('calendarId を OperationQuery に渡し、全運用の列車つきをそのまま返す', async () => {
            const expected = [
                { operation: { operationId: 'op-5' }, trips: [] },
            ] as unknown as OperationWithTripsDto[];
            mockOperationQuery.findManyWithTrips.mockResolvedValue(expected);

            const result = await service.findManyWithTrips({
                calendarId: 'cal-2',
            });

            expect(mockOperationQuery.findManyWithTrips).toHaveBeenCalledWith({
                calendarId: 'cal-2',
            });
            expect(result).toBe(expected);
        });
    });

    describe('findAllGroups', () => {
        it('operationNumberCirculateMap を群ごとに集約して返す', () => {
            const result = service.findAllGroups();

            expect(result).toContainEqual({
                groupName: '1群',
                operationNumbers: ['11', '12', '13', '14', '15', '16'],
            });
            expect(result).toContainEqual({
                groupName: '9G群',
                operationNumbers: ['91G', '92G', '93G', '94G', '95G'],
            });
            // 群の数だけ返る（1群/5群/6群/7群/9G群 の 5 群）
            expect(result).toHaveLength(5);
        });
    });
});
