import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TripBlockCommand } from '../infrastructure/commands/trip-block.command';
import { TripBlockQuery } from '../infrastructure/queries/trip-block.query';
import { TripBlockV3Service } from './trip-block.v3.service';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyMock = jest.MockedFunction<(...args: any[]) => any>;

const mockTripBlockQuery = {
    findManyByFilter: jest.fn() as AnyMock,
    findManyByFilterWithFields: jest.fn() as AnyMock,
};

describe('TripBlockV3Service - findManyByFilter', () => {
    let service: TripBlockV3Service;

    beforeEach(async () => {
        jest.clearAllMocks();
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TripBlockV3Service,
                { provide: TripBlockQuery, useValue: mockTripBlockQuery },
                { provide: TripBlockCommand, useValue: {} },
            ],
        }).compile();
        service = module.get(TripBlockV3Service);
    });

    it('fields が無ければ今までどおり全項目の取得をする', async () => {
        const expected = [{ tripBlockId: 'b1' }];
        mockTripBlockQuery.findManyByFilter.mockResolvedValue(expected);

        const result = await service.findManyByFilter({
            calendarId: 'c1',
            tripDirection: 0,
        });

        expect(mockTripBlockQuery.findManyByFilter).toHaveBeenCalledWith({
            calendarId: 'c1',
            tripDirection: 0,
        });
        expect(
            mockTripBlockQuery.findManyByFilterWithFields,
        ).not.toHaveBeenCalled();
        expect(result).toBe(expected);
    });

    it('fields があれば許可リストで検めてから項目を絞った取得をする', async () => {
        const expected = [{ id: 'b1', trips: [] }];
        mockTripBlockQuery.findManyByFilterWithFields.mockResolvedValue(
            expected,
        );

        const result = await service.findManyByFilter({
            calendarId: 'c1',
            tripDirection: 1,
            fields: { trip: 'tripNumber', time: 'stationId,arrivalTime' },
        });

        expect(
            mockTripBlockQuery.findManyByFilterWithFields,
        ).toHaveBeenCalledWith(
            { calendarId: 'c1', tripDirection: 1 },
            new Map([
                ['trip', new Set(['tripNumber'])],
                ['time', new Set(['stationId', 'arrivalTime'])],
            ]),
        );
        expect(mockTripBlockQuery.findManyByFilter).not.toHaveBeenCalled();
        expect(result).toBe(expected);
    });

    it('許可リストに無い項目は 400', async () => {
        await expect(
            service.findManyByFilter({
                calendarId: 'c1',
                tripDirection: 0,
                fields: { trip: 'password' },
            }),
        ).rejects.toThrow(BadRequestException);
        expect(
            mockTripBlockQuery.findManyByFilterWithFields,
        ).not.toHaveBeenCalled();
    });
});
