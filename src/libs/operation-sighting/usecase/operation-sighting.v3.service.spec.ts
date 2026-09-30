import { Test, TestingModule } from '@nestjs/testing';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { DataSource } from 'typeorm';
import { OperationSightingLatestCacheCommand } from '../infrastructure/command/operation-sighting-latest-cache.command';
import { OperationSightingCommand } from '../infrastructure/command/operation-sighting.command';
import { OperationSightingLatestCacheQuery } from '../infrastructure/queries/operation-sighting-latest-cache.query';
import { OperationSightingQuery } from '../infrastructure/queries/operation-sighting.query';
import { CalendarQuery } from 'src/libs/calendar/infrastructure/queries/calendar.query';
import { FormationQuery } from 'src/libs/formation/infrastructure/queries/formation.query';
import { OperationQuery } from 'src/libs/operation/infrastructure/queries/operation.query';
import { OperationSightingV3Service } from './operation-sighting.v3.service';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);
dayjs.tz.setDefault('Asia/Tokyo');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyMock = jest.MockedFunction<(...args: any[]) => any>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockManager: any = {};
const mockSave: AnyMock = jest.fn();
const mockOperationSightingCommand = { save: mockSave };
const mockOperationSightingLatestCacheCommand = {
    save: jest.fn() as AnyMock,
    remove: jest.fn() as AnyMock,
};
const mockOperationSightingLatestCacheQuery = {
    findOneByFormationNumber: jest.fn() as AnyMock,
    findManyLatestGroupByFormationByOperationNumbersAndSightingTimeRange: jest.fn() as AnyMock,
    findManyByFormationNumbers: jest.fn() as AnyMock,
};
const mockOperationSightingQuery = {
    findOneById: jest.fn() as AnyMock,
    findOneLatestByOperationNumberAndBeforeSightingTime: jest.fn() as AnyMock,
    findOneLatestByFormationNumberAndBeforeSightingTime: jest.fn() as AnyMock,
    findManyLatestByOperationNumbersAndBeforeSightingTime: jest.fn() as AnyMock,
    findManyLatestByFormationNumbersAndBeforeSightingTime: jest.fn() as AnyMock,
};
const mockDataSource = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    transaction: jest.fn().mockImplementation(async (fn: any) => fn(mockManager)) as AnyMock,
};
const mockCalendarQuery = { findOneBySpecificDate: jest.fn() as AnyMock };
const mockFormationQuery = {
    findManyBySpecificPeriod: jest.fn() as AnyMock,
    findOneByAgencyIdAndFormationNumberAndDate: jest.fn() as AnyMock,
    findOneByAgencyIdAndVehicleNumberAndDate: jest.fn() as AnyMock,
};
const mockOperationQuery = {
    findOneByCalendarIdAndOperationNumber: jest.fn() as AnyMock,
    findOneFirstDepartureTimeByOperationIdAndDate: jest.fn() as AnyMock,
    findManyByCalendarId: jest.fn() as AnyMock,
};

async function buildService(): Promise<OperationSightingV3Service> {
    const module: TestingModule = await Test.createTestingModule({
        providers: [
            OperationSightingV3Service,
            { provide: DataSource, useValue: mockDataSource },
            {
                provide: OperationSightingCommand,
                useValue: mockOperationSightingCommand,
            },
            {
                provide: OperationSightingLatestCacheCommand,
                useValue: mockOperationSightingLatestCacheCommand,
            },
            {
                provide: OperationSightingLatestCacheQuery,
                useValue: mockOperationSightingLatestCacheQuery,
            },
            {
                provide: OperationSightingQuery,
                useValue: mockOperationSightingQuery,
            },
            { provide: CalendarQuery, useValue: mockCalendarQuery },
            { provide: FormationQuery, useValue: mockFormationQuery },
            { provide: OperationQuery, useValue: mockOperationQuery },
        ],
    }).compile();
    return module.get(OperationSightingV3Service);
}

describe('OperationSightingV3Service - write side cache', () => {
    let service: OperationSightingV3Service;

    beforeEach(async () => {
        jest.clearAllMocks();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mockDataSource.transaction.mockImplementation(async (fn: any) =>
            fn(mockManager),
        );
        service = await buildService();
    });

    it('invalidate: キャッシュターゲットかつ前の有効目撃がない場合、cache が削除される', async () => {
        const sightingId = 'sighting-uuid';
        const dto = {
            operationSightingId: sightingId,
            formationId: 'f-id',
            operationId: 'o-id',
            sightingTime: new Date('2026-05-01T10:00:00+09:00'),
            operation: { operationNumber: '61' },
            formation: { formationNumber: '8001' },
            invalidation: null,
            managementLogs: [],
        };
        mockOperationSightingQuery.findOneById.mockResolvedValue(dto);
        mockOperationSightingLatestCacheQuery.findOneByFormationNumber.mockResolvedValue(
            {
                id: 'cache-uuid',
                operationSightingId: sightingId,
                operationNumber: '61',
                formationNumber: '8001',
                sightingTime: '2026-05-01T10:00:00+09:00',
            },
        );
        mockOperationSightingQuery.findOneLatestByFormationNumberAndBeforeSightingTime.mockResolvedValue(
            null,
        );
        mockSave.mockResolvedValue({ operationSightingId: sightingId });

        await service.invalidate({
            operationSightingId: sightingId,
            userId: 'u1',
            reason: 'test',
        });

        expect(
            mockOperationSightingLatestCacheCommand.remove,
        ).toHaveBeenCalledWith(
            expect.objectContaining({
                props: expect.objectContaining({ formationNumber: '8001' }),
            }),
            mockManager,
        );
        expect(
            mockOperationSightingLatestCacheCommand.save,
        ).not.toHaveBeenCalled();
    });

    it('invalidate: キャッシュターゲットかつ前の有効目撃がある場合、cache が付け替えられる', async () => {
        const sightingId = 'sighting-uuid';
        const dto = {
            operationSightingId: sightingId,
            formationId: 'f-id',
            operationId: 'o-id',
            sightingTime: new Date('2026-05-02T10:00:00+09:00'),
            operation: { operationNumber: '61' },
            formation: { formationNumber: '8001' },
            invalidation: null,
            managementLogs: [],
        };
        const prevSighting = {
            operationSightingId: 'sighting-prev',
            operation: { operationNumber: '61' },
            formation: { formationNumber: '8001' },
            sightingTime: new Date('2026-05-01T10:00:00+09:00'),
        };
        mockOperationSightingQuery.findOneById.mockResolvedValue(dto);
        mockOperationSightingLatestCacheQuery.findOneByFormationNumber.mockResolvedValue(
            {
                id: 'cache-uuid',
                operationSightingId: sightingId,
                operationNumber: '61',
                formationNumber: '8001',
                sightingTime: '2026-05-02T10:00:00+09:00',
            },
        );
        mockOperationSightingQuery.findOneLatestByFormationNumberAndBeforeSightingTime.mockResolvedValue(
            prevSighting,
        );
        mockSave.mockResolvedValue({ operationSightingId: sightingId });

        await service.invalidate({
            operationSightingId: sightingId,
            userId: 'u1',
            reason: 'test',
        });

        expect(
            mockOperationSightingLatestCacheCommand.save,
        ).toHaveBeenCalled();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const savedCache = mockOperationSightingLatestCacheCommand.save.mock.calls[0][0] as any;
        expect(savedCache.props.operationSightingId).toBe('sighting-prev');
        expect(
            mockOperationSightingLatestCacheCommand.remove,
        ).not.toHaveBeenCalled();
    });

    it('invalidate: キャッシュターゲットでない場合、cache は変更されない', async () => {
        const sightingId = 'sighting-old';
        const dto = {
            operationSightingId: sightingId,
            formationId: 'f-id',
            operationId: 'o-id',
            sightingTime: new Date('2026-04-30T10:00:00+09:00'),
            operation: { operationNumber: '61' },
            formation: { formationNumber: '8001' },
            invalidation: null,
            managementLogs: [],
        };
        mockOperationSightingQuery.findOneById.mockResolvedValue(dto);
        mockOperationSightingLatestCacheQuery.findOneByFormationNumber.mockResolvedValue(
            {
                id: 'cache-uuid',
                operationSightingId: 'sighting-newer',
                operationNumber: '62',
                formationNumber: '8001',
                sightingTime: '2026-05-01T10:00:00+09:00',
            },
        );
        mockSave.mockResolvedValue({ operationSightingId: sightingId });

        await service.invalidate({
            operationSightingId: sightingId,
            userId: 'u1',
            reason: 'test',
        });

        expect(
            mockOperationSightingLatestCacheCommand.save,
        ).not.toHaveBeenCalled();
        expect(
            mockOperationSightingLatestCacheCommand.remove,
        ).not.toHaveBeenCalled();
    });

    it('restore: 現在のキャッシュより新しい場合、cache が更新される', async () => {
        const sightingId = 'sighting-uuid';
        const dto = {
            operationSightingId: sightingId,
            formationId: 'f-id',
            operationId: 'o-id',
            sightingTime: new Date('2026-05-02T10:00:00+09:00'),
            operation: { operationNumber: '62' },
            formation: { formationNumber: '8001' },
            invalidation: {
                operationSightingId: sightingId,
                operationSightingInvalidationId: 'inv-id',
            },
            managementLogs: [],
        };
        mockOperationSightingQuery.findOneById.mockResolvedValue(dto);
        mockOperationSightingLatestCacheQuery.findOneByFormationNumber.mockResolvedValue(
            {
                id: 'cache-uuid',
                operationSightingId: 'sighting-older',
                operationNumber: '61',
                formationNumber: '8001',
                sightingTime: '2026-05-01T10:00:00+09:00',
            },
        );
        mockSave.mockResolvedValue({ operationSightingId: sightingId });

        await service.restore({
            operationSightingId: sightingId,
            userId: 'u1',
            reason: 'test',
        });

        expect(
            mockOperationSightingLatestCacheCommand.save,
        ).toHaveBeenCalled();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const savedCache = mockOperationSightingLatestCacheCommand.save.mock.calls[0][0] as any;
        expect(savedCache.props.operationSightingId).toBe(sightingId);
        expect(savedCache.props.operationNumber).toBe('62');
    });
});

describe('OperationSightingV3Service - findOneTimeCrossSectionByOperationNumber', () => {
    let service: OperationSightingV3Service;

    beforeEach(async () => {
        jest.clearAllMocks();
        service = await buildService();
    });

    it('latestSighting が null の場合は null/null を返す', async () => {
        mockOperationSightingQuery.findOneLatestByOperationNumberAndBeforeSightingTime.mockResolvedValue(null);
        mockCalendarQuery.findOneBySpecificDate.mockResolvedValue({
            id: 'cal-1', startDate: '2026-03-13',
        });

        const result = await service.findOneTimeCrossSectionByOperationNumber({
            operationNumber: '61',
            searchTime: '2026-05-30T15:00:00+09:00',
        });

        expect(result).toEqual({ latestSighting: null, expectedSighting: null });
        expect(
            mockOperationSightingLatestCacheQuery.findManyLatestGroupByFormationByOperationNumbersAndSightingTimeRange,
        ).not.toHaveBeenCalled();
    });

    it('当日の目撃がある場合、キャッシュ検索せずその編成をそのまま返す', async () => {
        const latestSighting = {
            id: 'sighting-1',
            operation: { operationNumber: '65' },
            formation: { formationNumber: '8001' },
            sightingTime: '2026-05-30T10:00:00.000+09:00',
        };
        mockOperationSightingQuery.findOneLatestByOperationNumberAndBeforeSightingTime.mockResolvedValue(latestSighting);
        mockCalendarQuery.findOneBySpecificDate.mockResolvedValue({ id: 'cal-1', startDate: '2026-03-13' });
        mockOperationSightingLatestCacheQuery.findOneByFormationNumber.mockResolvedValue({
            id: 'cache-1',
            operationSightingId: 'sighting-1',
            operationNumber: '65',
            formationNumber: '8001',
            sightingTime: '2026-05-30T10:00:00.000+09:00',
        });

        const result = await service.findOneTimeCrossSectionByOperationNumber({
            operationNumber: '65',
            searchTime: '2026-05-30T15:00:00+09:00',
        });

        expect(result.expectedSighting?.operation?.operationNumber).toBe('65');
        expect(result.expectedSighting?.formation?.formationNumber).toBe('8001');
        expect(
            mockOperationSightingLatestCacheQuery.findManyLatestGroupByFormationByOperationNumbersAndSightingTimeRange,
        ).not.toHaveBeenCalled();
    });

    it('当日の目撃があっても、その後その編成が別運用で目撃されていた場合は expectedSighting: null を返す', async () => {
        const latestSighting = {
            id: 'sighting-1',
            operation: { operationNumber: '65' },
            formation: { formationNumber: '8001' },
            sightingTime: '2026-05-30T10:00:00.000+09:00',
        };
        mockOperationSightingQuery.findOneLatestByOperationNumberAndBeforeSightingTime.mockResolvedValue(latestSighting);
        mockCalendarQuery.findOneBySpecificDate.mockResolvedValue({ id: 'cal-1', startDate: '2026-03-13' });
        mockOperationSightingLatestCacheQuery.findOneByFormationNumber.mockResolvedValue({
            id: 'cache-1',
            operationSightingId: 'sighting-2',
            operationNumber: '66',
            formationNumber: '8001',
            sightingTime: '2026-05-30T11:00:00.000+09:00',
        });

        const result = await service.findOneTimeCrossSectionByOperationNumber({
            operationNumber: '65',
            searchTime: '2026-05-30T15:00:00+09:00',
        });

        expect(result.latestSighting).toBe(latestSighting);
        expect(result.expectedSighting).toBeNull();
    });

    it('calendar が null の場合は expectedSighting: null を返す', async () => {
        const latestSighting = {
            id: 'sighting-1',
            operation: { operationNumber: '65' },
            formation: { formationNumber: '8001' },
            sightingTime: '2026-05-29T15:00:00.000+09:00',
        };
        mockOperationSightingQuery.findOneLatestByOperationNumberAndBeforeSightingTime.mockResolvedValue(latestSighting);
        mockCalendarQuery.findOneBySpecificDate.mockResolvedValue(null);

        const result = await service.findOneTimeCrossSectionByOperationNumber({
            operationNumber: '65',
            searchTime: '2026-05-30T15:00:00+09:00',
        });

        expect(result.latestSighting).toBe(latestSighting);
        expect(result.expectedSighting).toBeNull();
        expect(
            mockOperationSightingLatestCacheQuery.findManyLatestGroupByFormationByOperationNumbersAndSightingTimeRange,
        ).not.toHaveBeenCalled();
    });

    it('キャッシュから候補が見つかり前進投影が opN に一致する場合、その編成を expected として返す', async () => {
        // searchTime=2026-05-30 15:00 JST, today鉄道日=2026-05-30
        // キャッシュ: 63 が 2日前(2026-05-28 15:00)に編成 8001 で目撃
        // forwardK(63, 2) = 65 → searchOpN=65 にヒット
        const cacheSightingTime = '2026-05-28T15:00:00.000+09:00';
        const latestSighting = {
            id: 'sighting-1',
            operation: { operationNumber: '65' },
            formation: { formationNumber: '7001' },
            sightingTime: '2026-05-29T15:00:00.000+09:00',
        };
        mockOperationSightingQuery.findOneLatestByOperationNumberAndBeforeSightingTime.mockResolvedValue(latestSighting);
        mockCalendarQuery.findOneBySpecificDate.mockResolvedValue({ id: 'cal-1', startDate: '2026-03-13' });
        mockOperationSightingLatestCacheQuery.findManyLatestGroupByFormationByOperationNumbersAndSightingTimeRange.mockResolvedValue([
            {
                id: 'cache-1',
                operationNumber: '63',
                formationNumber: '8001',
                operationSightingId: 'sighting-2',
                sightingTime: cacheSightingTime,
            },
        ]);
        mockFormationQuery.findManyBySpecificPeriod.mockResolvedValue([
            { id: 'f-1', formationNumber: '8001' },
        ]);

        const result = await service.findOneTimeCrossSectionByOperationNumber({
            operationNumber: '65',
            searchTime: '2026-05-30T15:00:00+09:00',
        });

        expect(result.expectedSighting?.formation?.formationNumber).toBe('8001');
        expect(result.expectedSighting?.operation?.operationNumber).toBe('65');
    });

    it('キャッシュに候補がない場合は expectedSighting: null を返す', async () => {
        const latestSighting = {
            id: 'sighting-1',
            operation: { operationNumber: '65' },
            formation: { formationNumber: '7001' },
            sightingTime: '2026-05-29T15:00:00.000+09:00',
        };
        mockOperationSightingQuery.findOneLatestByOperationNumberAndBeforeSightingTime.mockResolvedValue(latestSighting);
        mockCalendarQuery.findOneBySpecificDate.mockResolvedValue({ id: 'cal-1', startDate: '2026-03-13' });
        mockOperationSightingLatestCacheQuery.findManyLatestGroupByFormationByOperationNumbersAndSightingTimeRange.mockResolvedValue([]);

        const result = await service.findOneTimeCrossSectionByOperationNumber({
            operationNumber: '65',
            searchTime: '2026-05-30T15:00:00+09:00',
        });

        expect(result.latestSighting).toBe(latestSighting);
        expect(result.expectedSighting).toBeNull();
    });

    it('候補の編成が formations テーブルに存在しない場合は expectedSighting: null を返す', async () => {
        // 64 が 1日前に 8001 で目撃 → buildCirculationPath('64', 1).expectedOperationNumber = '65' → 候補
        const latestSighting = {
            id: 'sighting-1',
            operation: { operationNumber: '65' },
            formation: { formationNumber: '7001' },
            sightingTime: '2026-05-29T15:00:00.000+09:00',
        };
        mockOperationSightingQuery.findOneLatestByOperationNumberAndBeforeSightingTime.mockResolvedValue(latestSighting);
        mockCalendarQuery.findOneBySpecificDate.mockResolvedValue({ id: 'cal-1', startDate: '2026-03-13' });
        mockOperationSightingLatestCacheQuery.findManyLatestGroupByFormationByOperationNumbersAndSightingTimeRange.mockResolvedValue([
            {
                id: 'cache-1',
                operationNumber: '64',
                formationNumber: '8001',
                operationSightingId: 'sighting-2',
                sightingTime: '2026-05-29T15:00:00.000+09:00',
            },
        ]);
        mockFormationQuery.findManyBySpecificPeriod.mockResolvedValue([]);

        const result = await service.findOneTimeCrossSectionByOperationNumber({
            operationNumber: '65',
            searchTime: '2026-05-30T15:00:00+09:00',
        });

        expect(result.latestSighting).toBe(latestSighting);
        expect(result.expectedSighting).toBeNull();
    });

});


describe('OperationSightingV3Service - findOneTimeCrossSectionByFormationNumber', () => {
    let service: OperationSightingV3Service;

    beforeEach(async () => {
        jest.clearAllMocks();
        service = await buildService();
    });

    it('latestSighting が null の場合は null/null を返す', async () => {
        mockOperationSightingQuery.findOneLatestByFormationNumberAndBeforeSightingTime.mockResolvedValue(null);
        mockCalendarQuery.findOneBySpecificDate.mockResolvedValue({ id: 'cal-1', startDate: '2026-03-13' });

        const result = await service.findOneTimeCrossSectionByFormationNumber({
            formationNumber: '8001',
            searchTime: '2026-05-30T15:00:00+09:00',
        });

        expect(result).toEqual({ latestSighting: null, expectedSighting: null });
    });

    it('当日の目撃がある場合、キャッシュ検索せずその運用をそのまま返す', async () => {
        const latestSighting = {
            id: 'sighting-1',
            operation: { id: 'op-63', operationNumber: '63' },
            formation: { id: 'f-1', formationNumber: '8001' },
            sightingTime: '2026-05-30T10:00:00.000+09:00',
        };
        mockOperationSightingQuery.findOneLatestByFormationNumberAndBeforeSightingTime.mockResolvedValue(latestSighting);
        mockCalendarQuery.findOneBySpecificDate.mockResolvedValue({ id: 'cal-1', startDate: '2026-03-13' });
        mockOperationSightingQuery.findOneLatestByOperationNumberAndBeforeSightingTime.mockResolvedValue(latestSighting);

        const result = await service.findOneTimeCrossSectionByFormationNumber({
            formationNumber: '8001',
            searchTime: '2026-05-30T15:00:00+09:00',
        });

        expect(result.expectedSighting?.operation?.operationNumber).toBe('63');
        expect(
            mockOperationSightingLatestCacheQuery.findManyLatestGroupByFormationByOperationNumbersAndSightingTimeRange,
        ).not.toHaveBeenCalled();
    });

    it('当日の目撃があっても、その後その運用に別編成が目撃されていた場合は expectedSighting: null を返す', async () => {
        const latestSighting = {
            id: 'sighting-1',
            operation: { id: 'op-38K', operationNumber: '38K' },
            formation: { id: 'f-3109', formationNumber: '3109' },
            sightingTime: '2026-05-30T10:00:00.000+09:00',
        };
        mockOperationSightingQuery.findOneLatestByFormationNumberAndBeforeSightingTime.mockResolvedValue(latestSighting);
        mockCalendarQuery.findOneBySpecificDate.mockResolvedValue({ id: 'cal-1', startDate: '2026-03-13' });
        mockOperationSightingQuery.findOneLatestByOperationNumberAndBeforeSightingTime.mockResolvedValue({
            id: 'sighting-2',
            operation: { id: 'op-38K', operationNumber: '38K' },
            formation: { id: 'f-3104', formationNumber: '3104' },
            sightingTime: '2026-05-30T11:00:00.000+09:00',
        });

        const result = await service.findOneTimeCrossSectionByFormationNumber({
            formationNumber: '3109',
            searchTime: '2026-05-30T15:00:00+09:00',
        });

        expect(result.latestSighting).toBe(latestSighting);
        expect(result.expectedSighting).toBeNull();
    });

    it('最新目撃が休車（100番）の場合は operation をそのまま返す', async () => {
        // 前日の目撃なので同日fast-pathは通らない
        const latestSighting = {
            id: 'sighting-1',
            operation: { id: 'op-100', operationNumber: '100' },
            formation: { id: 'f-1', formationNumber: '8001' },
            sightingTime: '2026-05-29T10:00:00.000+09:00',
        };
        mockOperationSightingQuery.findOneLatestByFormationNumberAndBeforeSightingTime.mockResolvedValue(latestSighting);
        mockCalendarQuery.findOneBySpecificDate.mockResolvedValue({ id: 'cal-1', startDate: '2026-03-13' });

        const result = await service.findOneTimeCrossSectionByFormationNumber({
            formationNumber: '8001',
            searchTime: '2026-05-30T15:00:00+09:00',
        });

        expect(result.expectedSighting?.operation?.operationNumber).toBe('100');
        expect(
            mockOperationSightingLatestCacheQuery.findManyLatestGroupByFormationByOperationNumbersAndSightingTimeRange,
        ).not.toHaveBeenCalled();
    });

    it('変位なしの場合、forward^k の運用を expected として返す', async () => {
        // 編成 8001 が 2日前(2026-05-28) に 63 で目撃
        // forwardK(63, 2) = 65 → expected.operation = 65
        const latestSighting = {
            id: 'sighting-1',
            operation: { id: 'op-63', operationNumber: '63' },
            formation: { id: 'f-1', formationNumber: '8001' },
            sightingTime: '2026-05-28T15:00:00.000+09:00',
        };
        mockOperationSightingQuery.findOneLatestByFormationNumberAndBeforeSightingTime.mockResolvedValue(latestSighting);
        mockCalendarQuery.findOneBySpecificDate.mockResolvedValue({ id: 'cal-1', startDate: '2026-03-13' });
        // パス [64, 65] すべて編成 8001 のまま（変位なし）
        mockOperationSightingLatestCacheQuery.findManyLatestGroupByFormationByOperationNumbersAndSightingTimeRange.mockResolvedValue([
            { id: 'cache-64', operationNumber: '64', formationNumber: '8001', operationSightingId: 'sighting-64', sightingTime: '2026-05-29T15:00:00.000+09:00' },
            { id: 'cache-65', operationNumber: '65', formationNumber: '8001', operationSightingId: 'sighting-65', sightingTime: '2026-05-30T10:00:00.000+09:00' },
        ]);
        mockOperationQuery.findManyByCalendarId.mockResolvedValue([
            { id: 'op-64', operationNumber: '64' },
            { id: 'op-65', operationNumber: '65' },
        ]);

        const result = await service.findOneTimeCrossSectionByFormationNumber({
            formationNumber: '8001',
            searchTime: '2026-05-30T15:00:00+09:00',
        });

        expect(result.expectedSighting?.operation?.operationNumber).toBe('65');
        expect(result.expectedSighting?.formation?.formationNumber).toBe('8001');
    });

    it('パス上に別編成の目撃がある場合は expectedSighting を null で返す', async () => {
        const latestSighting = {
            id: 'sighting-1',
            operation: { id: 'op-63', operationNumber: '63' },
            formation: { id: 'f-1', formationNumber: '8001' },
            sightingTime: '2026-05-28T15:00:00.000+09:00',
        };
        mockOperationSightingQuery.findOneLatestByFormationNumberAndBeforeSightingTime.mockResolvedValue(latestSighting);
        mockCalendarQuery.findOneBySpecificDate.mockResolvedValue({ id: 'cal-1', startDate: '2026-03-13' });
        // 64 に別編成が入っていた
        mockOperationSightingLatestCacheQuery.findManyLatestGroupByFormationByOperationNumbersAndSightingTimeRange.mockResolvedValue([
            {
                id: 'cache-x',
                operationNumber: '64',
                formationNumber: '9001',
                operationSightingId: 'sighting-x',
                sightingTime: '2026-05-29T15:00:00.000+09:00',
            },
        ]);

        const result = await service.findOneTimeCrossSectionByFormationNumber({
            formationNumber: '8001',
            searchTime: '2026-05-30T15:00:00+09:00',
        });

        expect(result.expectedSighting).toBeNull();
        expect(mockOperationQuery.findManyByCalendarId).not.toHaveBeenCalled();
    });

    it('calendar が null の場合は expectedSighting: null を返す', async () => {
        const latestSighting = {
            id: 'sighting-1',
            operation: { id: 'op-63', operationNumber: '63' },
            formation: { id: 'f-1', formationNumber: '8001' },
            sightingTime: '2026-05-28T15:00:00.000+09:00',
        };
        mockOperationSightingQuery.findOneLatestByFormationNumberAndBeforeSightingTime.mockResolvedValue(latestSighting);
        mockCalendarQuery.findOneBySpecificDate.mockResolvedValue(null);

        const result = await service.findOneTimeCrossSectionByFormationNumber({
            formationNumber: '8001',
            searchTime: '2026-05-30T15:00:00+09:00',
        });

        expect(result.latestSighting).toBe(latestSighting);
        expect(result.expectedSighting).toBeNull();
        expect(
            mockOperationSightingLatestCacheQuery.findManyLatestGroupByFormationByOperationNumbersAndSightingTimeRange,
        ).not.toHaveBeenCalled();
    });

    it('ダイヤ改正前の目撃の場合は expectedSighting: null を返す', async () => {
        // latestSighting が 2025-12-01（改正前）、calendar.startDate が 2026-03-13
        const latestSighting = {
            id: 'sighting-1',
            operation: { id: 'op-63', operationNumber: '63' },
            formation: { id: 'f-1', formationNumber: '8001' },
            sightingTime: '2025-12-01T15:00:00.000+09:00',
        };
        mockOperationSightingQuery.findOneLatestByFormationNumberAndBeforeSightingTime.mockResolvedValue(latestSighting);
        mockCalendarQuery.findOneBySpecificDate.mockResolvedValue({ id: 'cal-1', startDate: '2026-03-13' });

        const result = await service.findOneTimeCrossSectionByFormationNumber({
            formationNumber: '8001',
            searchTime: '2026-05-30T15:00:00+09:00',
        });

        expect(result.latestSighting).toBe(latestSighting);
        expect(result.expectedSighting).toBeNull();
        expect(
            mockOperationSightingLatestCacheQuery.findManyLatestGroupByFormationByOperationNumbersAndSightingTimeRange,
        ).not.toHaveBeenCalled();
    });

    it('buildCirculationPath が null を返す場合（循環マップ未定義運用）は expectedSighting を null で返す', async () => {
        // operationNumber '99' は循環マップに存在しないため buildCirculationPath が null を返す
        const latestSighting = {
            id: 'sighting-1',
            operation: { id: 'op-99', operationNumber: '99' },
            formation: { id: 'f-1', formationNumber: '8001' },
            sightingTime: '2026-05-28T15:00:00.000+09:00',
        };
        mockOperationSightingQuery.findOneLatestByFormationNumberAndBeforeSightingTime.mockResolvedValue(latestSighting);
        mockCalendarQuery.findOneBySpecificDate.mockResolvedValue({ id: 'cal-1', startDate: '2026-03-13' });

        const result = await service.findOneTimeCrossSectionByFormationNumber({
            formationNumber: '8001',
            searchTime: '2026-05-30T15:00:00+09:00',
        });

        expect(result.latestSighting).toBe(latestSighting);
        expect(result.expectedSighting).toBeNull();
        expect(
            mockOperationSightingLatestCacheQuery.findManyLatestGroupByFormationByOperationNumbersAndSightingTimeRange,
        ).not.toHaveBeenCalled();
    });

    it('候補が見つからない場合は expectedSighting: null を返す', async () => {
        // 編成 8001 が 2日前(2026-05-28)に 63 で目撃
        // buildCirculationPath('63', 2).expectedOperationNumber = '65'
        // キャッシュが空 → candidates.length === 0
        const latestSighting = {
            id: 'sighting-1',
            operation: { id: 'op-63', operationNumber: '63' },
            formation: { id: 'f-1', formationNumber: '8001' },
            sightingTime: '2026-05-28T15:00:00.000+09:00',
        };
        mockOperationSightingQuery.findOneLatestByFormationNumberAndBeforeSightingTime.mockResolvedValue(latestSighting);
        mockCalendarQuery.findOneBySpecificDate.mockResolvedValue({ id: 'cal-1', startDate: '2026-03-13' });
        mockOperationSightingLatestCacheQuery.findManyLatestGroupByFormationByOperationNumbersAndSightingTimeRange.mockResolvedValue([]);

        const result = await service.findOneTimeCrossSectionByFormationNumber({
            formationNumber: '8001',
            searchTime: '2026-05-30T15:00:00+09:00',
        });

        expect(result.latestSighting).toBe(latestSighting);
        expect(result.expectedSighting).toBeNull();
    });

    it('expected 運用番号が operations テーブルに存在しない場合は expectedSighting: null を返す', async () => {
        // 63 が 2日前に 8001 で目撃 → buildCirculationPath('63', 2).expectedOperationNumber = '65' → 候補
        // selectedCandidate.formationNumber === '8001' → 自編成 → #buildResultWithOperation へ
        // findManyByCalendarId が空 → operation 見つからず → null
        const latestSighting = {
            id: 'sighting-1',
            operation: { id: 'op-63', operationNumber: '63' },
            formation: { id: 'f-1', formationNumber: '8001' },
            sightingTime: '2026-05-28T15:00:00.000+09:00',
        };
        mockOperationSightingQuery.findOneLatestByFormationNumberAndBeforeSightingTime.mockResolvedValue(latestSighting);
        mockCalendarQuery.findOneBySpecificDate.mockResolvedValue({ id: 'cal-1', startDate: '2026-03-13' });
        mockOperationSightingLatestCacheQuery.findManyLatestGroupByFormationByOperationNumbersAndSightingTimeRange.mockResolvedValue([
            {
                id: 'cache-1',
                operationNumber: '63',
                formationNumber: '8001',
                operationSightingId: 'sighting-1',
                sightingTime: '2026-05-28T15:00:00.000+09:00',
            },
        ]);
        mockOperationQuery.findManyByCalendarId.mockResolvedValue([]);

        const result = await service.findOneTimeCrossSectionByFormationNumber({
            formationNumber: '8001',
            searchTime: '2026-05-30T15:00:00+09:00',
        });

        expect(result.latestSighting).toBe(latestSighting);
        expect(result.expectedSighting).toBeNull();
    });
});

describe('OperationSightingV3Service - post', () => {
    let service: OperationSightingV3Service;

    const baseParams = {
        agencyId: 'agency-uuid',
        formationOrVehicleNumber: '10708',
        operationNumber: '100',
        sightingTime: '2026-05-01T10:00:00+09:00',
    };

    beforeEach(async () => {
        jest.clearAllMocks();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mockDataSource.transaction.mockImplementation(async (fn: any) =>
            fn(mockManager),
        );
        service = await buildService();

        mockCalendarQuery.findOneBySpecificDate.mockResolvedValue({
            id: 'cal-1',
        });
        mockFormationQuery.findOneByAgencyIdAndFormationNumberAndDate.mockResolvedValue(
            { id: 'f-1', formationNumber: '10708' },
        );
        mockOperationSightingLatestCacheQuery.findOneByFormationNumber.mockResolvedValue(
            null,
        );
        mockSave.mockResolvedValue({
            operationSightingId: 'new-sighting-uuid',
        });
    });

    it('休車（100番）は始発時刻を持たないため、始発時刻の検証を行わずに投稿できる', async () => {
        mockOperationQuery.findOneByCalendarIdAndOperationNumber.mockResolvedValue(
            { id: 'op-100', operationNumber: '100' },
        );
        mockOperationQuery.findOneFirstDepartureTimeByOperationIdAndDate.mockResolvedValue(
            null,
        );

        const result = await service.post({ ...baseParams });

        expect(result.operationSightingId).toBe('new-sighting-uuid');
        expect(mockSave).toHaveBeenCalled();
        expect(
            mockOperationQuery.findOneFirstDepartureTimeByOperationIdAndDate,
        ).not.toHaveBeenCalled();
    });

    it('休車（100番）は早朝の時刻でも投稿できる', async () => {
        mockOperationQuery.findOneByCalendarIdAndOperationNumber.mockResolvedValue(
            { id: 'op-100', operationNumber: '100' },
        );
        mockOperationQuery.findOneFirstDepartureTimeByOperationIdAndDate.mockResolvedValue(
            null,
        );

        const result = await service.post({
            ...baseParams,
            sightingTime: '2026-05-01T04:10:00+09:00',
        });

        expect(result.operationSightingId).toBe('new-sighting-uuid');
    });

    it('通常運用で始発時刻が特定できない場合はエラーになる', async () => {
        mockOperationQuery.findOneByCalendarIdAndOperationNumber.mockResolvedValue(
            { id: 'op-11', operationNumber: '11' },
        );
        mockOperationQuery.findOneFirstDepartureTimeByOperationIdAndDate.mockResolvedValue(
            null,
        );

        await expect(
            service.post({ ...baseParams, operationNumber: '11' }),
        ).rejects.toThrow('対象運用の始発時刻を特定できません');
    });

    it('通常運用で始発時刻の30分前より早い場合はエラーになる', async () => {
        mockOperationQuery.findOneByCalendarIdAndOperationNumber.mockResolvedValue(
            { id: 'op-11', operationNumber: '11' },
        );
        mockOperationQuery.findOneFirstDepartureTimeByOperationIdAndDate.mockResolvedValue(
            dayjs('2026-05-01T10:00:00+09:00'),
        );

        await expect(
            service.post({
                ...baseParams,
                operationNumber: '11',
                sightingTime: '2026-05-01T09:00:00+09:00',
            }),
        ).rejects.toThrow('始発時刻の30分前より前の時刻は投稿できません');
    });
});

describe('OperationSightingV3Service - 時刻断面をまとめて返す', () => {
    let service: OperationSightingV3Service;
    const searchTime = '2026-05-30T15:00:00+09:00';

    beforeEach(async () => {
        jest.clearAllMocks();
        service = await buildService();
        mockCalendarQuery.findOneBySpecificDate.mockResolvedValue({ id: 'cal-1', startDate: '2026-03-13' });
    });

    it('運用番号: 最新目撃は 1 回でまとめて引き、1 件ずつの口は使わず、休車の 100 は省く', async () => {
        // 65 は前日の目撃 → 群のキャッシュから 8001 を前進投影（1 件ずつの口のテストと同じ場面）
        mockOperationSightingQuery.findManyLatestByOperationNumbersAndBeforeSightingTime.mockResolvedValue(
            new Map([
                ['65', {
                    id: 'sighting-1',
                    operation: { operationNumber: '65' },
                    formation: { formationNumber: '7001' },
                    sightingTime: '2026-05-29T15:00:00.000+09:00',
                }],
            ]),
        );
        mockOperationSightingLatestCacheQuery.findManyByFormationNumbers.mockResolvedValue(new Map());
        mockOperationSightingLatestCacheQuery.findManyLatestGroupByFormationByOperationNumbersAndSightingTimeRange.mockResolvedValue([
            {
                id: 'cache-1',
                operationNumber: '63',
                formationNumber: '8001',
                operationSightingId: 'sighting-2',
                sightingTime: '2026-05-28T15:00:00.000+09:00',
            },
        ]);
        mockFormationQuery.findManyBySpecificPeriod.mockResolvedValue([{ id: 'f-1', formationNumber: '8001' }]);

        const result = await service.findManyTimeCrossSectionsByOperationNumbers({
            operationNumbers: ['65', '100', '61'],
            searchTime,
        });

        expect(Object.keys(result).sort()).toEqual(['61', '65']);
        expect(result['65'].expectedSighting?.formation?.formationNumber).toBe('8001');
        expect(result['61']).toEqual({ latestSighting: null, expectedSighting: null });
        expect(mockOperationSightingQuery.findManyLatestByOperationNumbersAndBeforeSightingTime).toHaveBeenCalledTimes(1);
        expect(mockOperationSightingQuery.findManyLatestByOperationNumbersAndBeforeSightingTime.mock.calls[0][0].operationNumbers).toEqual(['65', '61']);
        expect(mockOperationSightingQuery.findOneLatestByOperationNumberAndBeforeSightingTime).not.toHaveBeenCalled();
        expect(mockCalendarQuery.findOneBySpecificDate).toHaveBeenCalledTimes(1);
    });

    it('運用番号: 同じ群の番号が並んでも群のキャッシュ・編成一覧は 1 回だけ引く', async () => {
        const sighting = (operationNumber: string) => ({
            id: `s-${operationNumber}`,
            operation: { operationNumber },
            formation: { formationNumber: '7001' },
            sightingTime: '2026-05-29T15:00:00.000+09:00',
        });
        mockOperationSightingQuery.findManyLatestByOperationNumbersAndBeforeSightingTime.mockResolvedValue(
            new Map([['63', sighting('63')], ['65', sighting('65')]]),
        );
        mockOperationSightingLatestCacheQuery.findManyByFormationNumbers.mockResolvedValue(new Map());
        mockOperationSightingLatestCacheQuery.findManyLatestGroupByFormationByOperationNumbersAndSightingTimeRange.mockResolvedValue([
            { id: 'c', operationNumber: '63', formationNumber: '8001', operationSightingId: 's', sightingTime: '2026-05-28T15:00:00.000+09:00' },
        ]);
        mockFormationQuery.findManyBySpecificPeriod.mockResolvedValue([{ id: 'f-1', formationNumber: '8001' }]);

        await service.findManyTimeCrossSectionsByOperationNumbers({ operationNumbers: ['63', '65'], searchTime });

        expect(mockOperationSightingLatestCacheQuery.findManyLatestGroupByFormationByOperationNumbersAndSightingTimeRange).toHaveBeenCalledTimes(1);
        expect(mockFormationQuery.findManyBySpecificPeriod).toHaveBeenCalledTimes(1);
    });

    it('運用番号: 当日の目撃の追い出し判定は、まとめて引いた編成のキャッシュを使う', async () => {
        mockOperationSightingQuery.findManyLatestByOperationNumbersAndBeforeSightingTime.mockResolvedValue(
            new Map([
                ['61', { id: 's', operation: { operationNumber: '61' }, formation: { formationNumber: '10701' }, sightingTime: '2026-05-30T10:00:00.000+09:00' }],
            ]),
        );
        mockOperationSightingLatestCacheQuery.findManyByFormationNumbers.mockResolvedValue(
            new Map([['10701', { operationNumber: '62', formationNumber: '10701' }]]),
        );

        const result = await service.findManyTimeCrossSectionsByOperationNumbers({ operationNumbers: ['61'], searchTime });

        expect(mockOperationSightingLatestCacheQuery.findManyByFormationNumbers).toHaveBeenCalledWith({ formationNumbers: ['10701'] });
        expect(mockOperationSightingLatestCacheQuery.findOneByFormationNumber).not.toHaveBeenCalled();
        expect(result['61'].expectedSighting).toBeNull();
    });

    it('編成番号: 最新目撃をまとめて引き、追い出し判定に要る運用側の最新目撃もまとめて引く', async () => {
        mockOperationSightingQuery.findManyLatestByFormationNumbersAndBeforeSightingTime.mockResolvedValue(
            new Map([
                ['10701', { id: 's1', operation: { operationNumber: '61' }, formation: { formationNumber: '10701' }, sightingTime: '2026-05-30T10:00:00.000+09:00' }],
            ]),
        );
        mockOperationSightingQuery.findManyLatestByOperationNumbersAndBeforeSightingTime.mockResolvedValue(
            new Map([
                ['61', { id: 's1', operation: { operationNumber: '61' }, formation: { formationNumber: '10701' }, sightingTime: '2026-05-30T10:00:00.000+09:00' }],
            ]),
        );

        const result = await service.findManyTimeCrossSectionsByFormationNumbers({
            formationNumbers: ['10701', '10702'],
            searchTime,
        });

        expect(mockOperationSightingQuery.findManyLatestByOperationNumbersAndBeforeSightingTime.mock.calls[0][0].operationNumbers).toEqual(['61']);
        expect(mockOperationSightingQuery.findOneLatestByOperationNumberAndBeforeSightingTime).not.toHaveBeenCalled();
        expect(result['10701'].expectedSighting?.operation?.operationNumber).toBe('61');
        expect(result['10702']).toEqual({ latestSighting: null, expectedSighting: null });
    });

    it('時刻を指定しなければ全件で同じ瞬間を使う', async () => {
        mockOperationSightingQuery.findManyLatestByFormationNumbersAndBeforeSightingTime.mockResolvedValue(new Map());
        mockOperationSightingQuery.findManyLatestByOperationNumbersAndBeforeSightingTime.mockResolvedValue(new Map());

        await service.findManyTimeCrossSectionsByFormationNumbers({ formationNumbers: ['10701', '10702'] });

        const [formationCall] = mockOperationSightingQuery.findManyLatestByFormationNumbersAndBeforeSightingTime.mock.calls[0];
        const [operationCall] = mockOperationSightingQuery.findManyLatestByOperationNumbersAndBeforeSightingTime.mock.calls[0];
        expect(formationCall.sightingTime.valueOf()).toBe(operationCall.sightingTime.valueOf());
    });
});
