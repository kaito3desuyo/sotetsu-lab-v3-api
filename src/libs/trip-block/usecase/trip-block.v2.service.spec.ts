import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TripDetailsDto } from 'src/libs/trip/usecase/dtos/trip-details.dto';
import { TripBlockCommand } from '../infrastructure/commands/trip-block.command';
import { TripBlockQuery } from '../infrastructure/queries/trip-block.query';
import { TripBlockDetailsDto } from './dtos/trip-block-details.dto';
import { TripBlockV2Service } from './trip-block.v2.service';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyMock = jest.MockedFunction<(...args: any[]) => any>;

const mockTripBlockQuery = {
    findManyTripBlocks: jest.fn() as AnyMock,
    findOneTripBlock: jest.fn() as AnyMock,
    findOneTripBlockByTripBlockId: jest.fn() as AnyMock,
    findOneTripBlockByTripId: jest.fn() as AnyMock,
};

const mockTripBlockCommand = {
    createManyTripBlocks: jest.fn() as AnyMock,
    replaceOneTripBlock: jest.fn() as AnyMock,
    replaceOneTripBlockByDomain: jest.fn() as AnyMock,
    deleteOneTripBlockByDomain: jest.fn() as AnyMock,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const crudRequest: any = {};

function makeTripDetailsDto(tripId: string, tripBlockId: string): TripDetailsDto {
    return {
        id: tripId,
        serviceId: 'svc-1',
        tripNumber: 'T001',
        tripClassId: 'tc-1',
        tripName: '',
        tripDirection: 0,
        tripBlockId,
        depotIn: false,
        depotOut: false,
        calendarId: 'cal-1',
        extraCalendarId: null,
        times: [],
        tripOperationLists: [],
    } as unknown as TripDetailsDto;
}

function makeTripBlockDetailsDto(id: string, tripIds: string[]): TripBlockDetailsDto {
    return {
        id,
        trips: tripIds.map((tid) => makeTripDetailsDto(tid, id)),
        createdAt: new Date(),
        updatedAt: new Date(),
    } as unknown as TripBlockDetailsDto;
}

async function buildService(): Promise<TripBlockV2Service> {
    const module: TestingModule = await Test.createTestingModule({
        providers: [
            TripBlockV2Service,
            { provide: TripBlockQuery, useValue: mockTripBlockQuery },
            { provide: TripBlockCommand, useValue: mockTripBlockCommand },
        ],
    }).compile();

    return module.get<TripBlockV2Service>(TripBlockV2Service);
}

describe('TripBlockV2Service', () => {
    let service: TripBlockV2Service;

    beforeEach(async () => {
        jest.clearAllMocks();
        service = await buildService();
    });

    describe('findMany', () => {
        it('CrudRequest を TripBlockQuery に渡してそのまま返す', async () => {
            const expected = [makeTripBlockDetailsDto('tb-1', ['trip-1'])];
            mockTripBlockQuery.findManyTripBlocks.mockResolvedValue(expected);

            const result = await service.findMany(crudRequest);

            expect(mockTripBlockQuery.findManyTripBlocks).toHaveBeenCalledWith(crudRequest);
            expect(result).toBe(expected);
        });
    });

    describe('findOne', () => {
        it('CrudRequest を TripBlockQuery に渡してそのまま返す', async () => {
            const expected = makeTripBlockDetailsDto('tb-1', ['trip-1']);
            mockTripBlockQuery.findOneTripBlock.mockResolvedValue(expected);

            const result = await service.findOne(crudRequest);

            expect(mockTripBlockQuery.findOneTripBlock).toHaveBeenCalledWith(crudRequest);
            expect(result).toBe(expected);
        });
    });

    describe('addTripToTripBlock', () => {
        it('from（tripId に紐づく TripBlock）が見つからない場合 NotFoundException を投げる', async () => {
            mockTripBlockQuery.findOneTripBlockByTripId.mockResolvedValue(null);
            mockTripBlockQuery.findOneTripBlockByTripBlockId.mockResolvedValue(
                makeTripBlockDetailsDto('tb-to', ['trip-2']),
            );

            await expect(
                service.addTripToTripBlock(crudRequest, {
                    id: 'tb-to',
                    tripId: 'trip-1',
                }),
            ).rejects.toThrow(NotFoundException);
        });

        it('to（移動先 TripBlock）が見つからない場合 NotFoundException を投げる', async () => {
            mockTripBlockQuery.findOneTripBlockByTripId.mockResolvedValue(
                makeTripBlockDetailsDto('tb-from', ['trip-1']),
            );
            mockTripBlockQuery.findOneTripBlockByTripBlockId.mockResolvedValue(null);

            await expect(
                service.addTripToTripBlock(crudRequest, {
                    id: 'tb-to',
                    tripId: 'trip-1',
                }),
            ).rejects.toThrow(NotFoundException);
        });

        it('移動後に from が空になれば deleteOneTripBlockByDomain を呼ぶ', async () => {
            mockTripBlockQuery.findOneTripBlockByTripId.mockResolvedValue(
                makeTripBlockDetailsDto('tb-from', ['trip-1']),
            );
            mockTripBlockQuery.findOneTripBlockByTripBlockId.mockResolvedValue(
                makeTripBlockDetailsDto('tb-to', ['trip-2']),
            );
            const expected = makeTripBlockDetailsDto('tb-to', ['trip-1', 'trip-2']);
            mockTripBlockQuery.findOneTripBlock.mockResolvedValue(expected);
            mockTripBlockCommand.replaceOneTripBlockByDomain.mockResolvedValue(undefined);
            mockTripBlockCommand.deleteOneTripBlockByDomain.mockResolvedValue(undefined);

            const result = await service.addTripToTripBlock(crudRequest, {
                id: 'tb-to',
                tripId: 'trip-1',
            });

            expect(mockTripBlockCommand.replaceOneTripBlockByDomain).toHaveBeenCalledTimes(1);
            expect(mockTripBlockCommand.deleteOneTripBlockByDomain).toHaveBeenCalledTimes(1);
            expect(result).toBe(expected);
        });
    });

    describe('deleteTripFromTripBlock', () => {
        it('TripBlock が見つからない場合 NotFoundException を投げる', async () => {
            mockTripBlockQuery.findOneTripBlockByTripBlockId.mockResolvedValue(null);

            await expect(
                service.deleteTripFromTripBlock(crudRequest, {
                    id: 'tb-1',
                    tripId: 'trip-1',
                    holdAsAnotherTripBlock: false,
                }),
            ).rejects.toThrow(NotFoundException);
        });

        it('TripBlock に対象 Trip が含まれていない場合 NotFoundException を投げる', async () => {
            mockTripBlockQuery.findOneTripBlockByTripBlockId.mockResolvedValue(
                makeTripBlockDetailsDto('tb-1', ['trip-2']),
            );

            await expect(
                service.deleteTripFromTripBlock(crudRequest, {
                    id: 'tb-1',
                    tripId: 'trip-999',
                    holdAsAnotherTripBlock: false,
                }),
            ).rejects.toThrow(NotFoundException);
        });

        it('holdAsAnotherTripBlock=false: TripBlock から削除して空なら deleteOneTripBlockByDomain を呼ぶ', async () => {
            mockTripBlockQuery.findOneTripBlockByTripBlockId.mockResolvedValue(
                makeTripBlockDetailsDto('tb-1', ['trip-1']),
            );
            const expected = makeTripBlockDetailsDto('tb-1', []);
            mockTripBlockQuery.findOneTripBlock.mockResolvedValue(expected);
            mockTripBlockCommand.replaceOneTripBlockByDomain.mockResolvedValue(undefined);
            mockTripBlockCommand.deleteOneTripBlockByDomain.mockResolvedValue(undefined);

            const result = await service.deleteTripFromTripBlock(crudRequest, {
                id: 'tb-1',
                tripId: 'trip-1',
                holdAsAnotherTripBlock: false,
            });

            expect(mockTripBlockCommand.replaceOneTripBlockByDomain).toHaveBeenCalledTimes(1);
            expect(mockTripBlockCommand.deleteOneTripBlockByDomain).toHaveBeenCalledTimes(1);
            expect(result).toBe(expected);
        });

        it('holdAsAnotherTripBlock=true: 別 TripBlock として保持する', async () => {
            mockTripBlockQuery.findOneTripBlockByTripBlockId.mockResolvedValue(
                makeTripBlockDetailsDto('tb-1', ['trip-1', 'trip-2']),
            );
            const expected = makeTripBlockDetailsDto('tb-1', ['trip-2']);
            mockTripBlockQuery.findOneTripBlock.mockResolvedValue(expected);
            mockTripBlockCommand.replaceOneTripBlockByDomain.mockResolvedValue(undefined);

            const result = await service.deleteTripFromTripBlock(crudRequest, {
                id: 'tb-1',
                tripId: 'trip-1',
                holdAsAnotherTripBlock: true,
            });

            expect(mockTripBlockCommand.replaceOneTripBlockByDomain).toHaveBeenCalledTimes(1);
            expect(mockTripBlockCommand.deleteOneTripBlockByDomain).not.toHaveBeenCalled();
            expect(result).toBe(expected);
        });
    });
});
