import type { MockedFunction } from 'vitest';
import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat.js';
import timezone from 'dayjs/plugin/timezone.js';
import utc from 'dayjs/plugin/utc.js';
import { DataSource } from 'typeorm';
import { lockFormationCache } from '../infrastructure/command/formation-cache-lock.js';
import { OperationSightingLatestCacheCommand } from '../infrastructure/command/operation-sighting-latest-cache.command.js';
import { OperationSightingCommand } from '../infrastructure/command/operation-sighting.command.js';
import { OperationSightingAuthorCommand } from '../infrastructure/command/operation-sighting-author.command.js';
import { UserAccessTraceService } from '../../user/usecase/user-access-trace.service.js';
import { CdnInvalidation } from '../../../core/modules/cdn-invalidation/cdn-invalidation.js';
import { SocketSignal } from '../../../core/modules/socket-signal/socket-signal.js';
import { OperationSightingLatestCacheQuery } from '../infrastructure/queries/operation-sighting-latest-cache.query.js';
import { OperationSightingQuery } from '../infrastructure/queries/operation-sighting.query.js';
import { CalendarQuery } from '../../calendar/infrastructure/queries/calendar.query.js';
import { FormationQuery } from '../../formation/infrastructure/queries/formation.query.js';
import { OperationQuery } from '../../operation/infrastructure/queries/operation.query.js';
import { UseCaseError } from '../../../core/classes/custom-error.js';
import {
    INVALIDATE_MANY_TIME_BUDGET_MS,
    INVALIDATE_MANY_UNEXPECTED_MESSAGE,
    OperationSightingV3Service,
} from './operation-sighting.v3.service.js';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);
dayjs.tz.setDefault('Asia/Tokyo');

vi.mock('../infrastructure/command/formation-cache-lock.js', () => ({
    lockFormationCache: vi.fn().mockResolvedValue(undefined),
}));
const mockLock = vi.mocked(lockFormationCache);

type AnyMock = MockedFunction<(...args: any[]) => any>;

const mockManager: any = {};
const mockSave: AnyMock = vi.fn();
const mockOperationSightingCommand = { save: mockSave };
const mockAuthorCreate: AnyMock = vi.fn();
const mockOperationSightingAuthorCommand = { create: mockAuthorCreate };
const mockRecordPost: AnyMock = vi.fn().mockResolvedValue(undefined);
const mockPurgeExpiredIfDue: AnyMock = vi.fn().mockResolvedValue(undefined);
const mockAccessTraces = {
    recordPost: mockRecordPost,
    purgeExpiredIfDue: mockPurgeExpiredIfDue,
};
const mockSignalSend: AnyMock = vi.fn().mockResolvedValue(undefined);
const mockSocketSignal = { send: mockSignalSend };
const mockInvalidate: AnyMock = vi.fn().mockResolvedValue(undefined);
const mockCdnInvalidation = { invalidate: mockInvalidate };
const mockOperationSightingLatestCacheCommand = {
    save: vi.fn() as AnyMock,
    remove: vi.fn() as AnyMock,
};
const mockOperationSightingLatestCacheQuery = {
    findOneByFormationNumber: vi.fn() as AnyMock,
    findManyLatestGroupByFormationByOperationNumbersAndSightingTimeRange:
        vi.fn() as AnyMock,
    findManyByFormationNumbers: vi.fn() as AnyMock,
};
const mockOperationSightingQuery = {
    findOneById: vi.fn() as AnyMock,
    findOneLatestByOperationNumberAndBeforeSightingTime: vi.fn() as AnyMock,
    findOneLatestByFormationNumberAndBeforeSightingTime: vi.fn() as AnyMock,
    findManyLatestByOperationNumbersAndBeforeSightingTime: vi.fn() as AnyMock,
    findManyLatestByFormationNumbersAndBeforeSightingTime: vi.fn() as AnyMock,
    findManyBySightingTimeRange: vi.fn() as AnyMock,
    findManyBySpecificPeriod: vi.fn() as AnyMock,
};
const mockItinerarySegmentQuery = { findManyByCalendarId: vi.fn() as AnyMock };
const mockDataSource = {
    transaction: vi
        .fn()
        .mockImplementation(async (fn: any) => fn(mockManager)) as AnyMock,
};
const mockCalendarQuery = { findOneBySpecificDate: vi.fn() as AnyMock };
const mockFormationQuery = {
    findManyBySpecificPeriod: vi.fn() as AnyMock,
    findOneByAgencyIdAndFormationNumberAndDate: vi.fn() as AnyMock,
    findOneByAgencyIdAndVehicleNumberAndDate: vi.fn() as AnyMock,
};
const mockOperationQuery = {
    findOneByCalendarIdAndOperationNumber: vi.fn() as AnyMock,
    findOneFirstDepartureTimeByOperationIdAndDate: vi.fn() as AnyMock,
    findManyByCalendarId: vi.fn() as AnyMock,
};

async function buildService(): Promise<OperationSightingV3Service> {
    // 既定は区間なし・今日の目撃なし（今の判定の経路を使う）
    mockItinerarySegmentQuery.findManyByCalendarId.mockResolvedValue([]);
    mockOperationSightingQuery.findManyBySightingTimeRange.mockResolvedValue(
        [],
    );
    const module: TestingModule = await Test.createTestingModule({
        providers: [
            OperationSightingV3Service,
            { provide: DataSource, useValue: mockDataSource },
            {
                provide: OperationSightingCommand,
                useValue: mockOperationSightingCommand,
            },
            {
                provide: OperationSightingAuthorCommand,
                useValue: mockOperationSightingAuthorCommand,
            },
            { provide: SocketSignal, useValue: mockSocketSignal },
            { provide: UserAccessTraceService, useValue: mockAccessTraces },
            { provide: CdnInvalidation, useValue: mockCdnInvalidation },
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
        vi.clearAllMocks();
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
        expect(mockSignalSend).toHaveBeenCalledWith({ type: 'sighting' });
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

        expect(mockOperationSightingLatestCacheCommand.save).toHaveBeenCalled();
        const savedCache = mockOperationSightingLatestCacheCommand.save.mock
            .calls[0][0] as any;
        expect(savedCache.props.operationSightingId).toBe('sighting-prev');
        expect(
            mockOperationSightingLatestCacheCommand.remove,
        ).not.toHaveBeenCalled();
        expect(mockSignalSend).toHaveBeenCalledWith({ type: 'sighting' });
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
        expect(mockSignalSend).toHaveBeenCalledWith({ type: 'sighting' });
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

        expect(mockOperationSightingLatestCacheCommand.save).toHaveBeenCalled();
        const savedCache = mockOperationSightingLatestCacheCommand.save.mock
            .calls[0][0] as any;
        expect(savedCache.props.operationSightingId).toBe(sightingId);
        expect(savedCache.props.operationNumber).toBe('62');
        expect(mockSignalSend).toHaveBeenCalledWith({ type: 'sighting' });
    });
});

describe('OperationSightingV3Service - 編成ごとの lock', () => {
    let service: OperationSightingV3Service;
    const sightingId = 'sighting-uuid';
    const baseDto = {
        operationSightingId: sightingId,
        formationId: 'f-id',
        operationId: 'o-id',
        sightingTime: new Date('2026-05-02T10:00:00+09:00'),
        operation: { operationNumber: '62' },
        formation: { formationNumber: '8001' },
        invalidation: undefined,
        managementLogs: [],
    };
    const invalidated = {
        operationSightingId: sightingId,
        operationSightingInvalidationId: 'inv-id',
    };
    const params = {
        operationSightingId: sightingId,
        userId: 'u1',
        reason: 'r',
    };

    beforeEach(async () => {
        vi.clearAllMocks();
        mockDataSource.transaction.mockImplementation(async (fn: any) =>
            fn(mockManager),
        );
        service = await buildService();
        mockSave.mockResolvedValue({ operationSightingId: sightingId });
    });

    it('post: transaction の中で lock → 同じ manager でキャッシュを読む。外では読まない', async () => {
        const order: string[] = [];
        mockCalendarQuery.findOneBySpecificDate.mockResolvedValue({
            id: 'cal-1',
        });
        mockFormationQuery.findOneByAgencyIdAndFormationNumberAndDate.mockResolvedValue(
            { id: 'f-1', formationNumber: '10708' },
        );
        mockOperationQuery.findOneByCalendarIdAndOperationNumber.mockResolvedValue(
            { id: 'op-100', operationNumber: '100' },
        );
        mockOperationQuery.findOneFirstDepartureTimeByOperationIdAndDate.mockResolvedValue(
            null,
        );
        mockDataSource.transaction.mockImplementation(async (fn: any) => {
            order.push('tx-start');
            const r = await fn(mockManager);
            order.push('tx-end');
            return r;
        });
        mockLock.mockImplementation(async () => {
            order.push('lock');
        });
        mockOperationSightingLatestCacheQuery.findOneByFormationNumber.mockImplementation(
            async () => {
                order.push('read-cache');
                return null;
            },
        );
        mockSave.mockImplementation(async () => {
            order.push('save');
            return { operationSightingId: 'n' };
        });

        await service.post({
            agencyId: 'agency-uuid',
            formationOrVehicleNumber: '10708',
            operationNumber: '100',
            sightingTime: '2026-05-01T10:00:00+09:00',
            viewer: { ip: null, userAgent: null },
            userId: null,
        });

        expect(order).toEqual([
            'tx-start',
            'lock',
            'read-cache',
            'save',
            'tx-end',
        ]);
        expect(mockLock).toHaveBeenCalledWith(mockManager, '10708');
        expect(
            mockOperationSightingLatestCacheQuery.findOneByFormationNumber,
        ).toHaveBeenCalledWith({ formationNumber: '10708' }, mockManager);
    });

    it('invalidate: lock の後に manager で目撃・キャッシュ・直前の目撃を読み直す', async () => {
        const order: string[] = [];
        mockOperationSightingQuery.findOneById.mockImplementation(
            async (_p: any, manager?: any) => {
                order.push(manager ? 'reread' : 'first-read');
                return { ...baseDto };
            },
        );
        mockLock.mockImplementation(async () => {
            order.push('lock');
        });
        mockOperationSightingLatestCacheQuery.findOneByFormationNumber.mockResolvedValue(
            {
                id: 'cache-uuid',
                operationSightingId: sightingId,
                operationNumber: '62',
                formationNumber: '8001',
                sightingTime: '2026-05-02T10:00:00+09:00',
            },
        );
        mockOperationSightingQuery.findOneLatestByFormationNumberAndBeforeSightingTime.mockResolvedValue(
            null,
        );

        await service.invalidate(params);

        expect(order).toEqual(['first-read', 'lock', 'reread']);
        expect(mockLock).toHaveBeenCalledWith(mockManager, '8001');
        expect(mockOperationSightingQuery.findOneById).toHaveBeenLastCalledWith(
            { id: sightingId },
            mockManager,
        );
        expect(
            mockOperationSightingLatestCacheQuery.findOneByFormationNumber,
        ).toHaveBeenCalledWith({ formationNumber: '8001' }, mockManager);
        expect(
            mockOperationSightingQuery.findOneLatestByFormationNumberAndBeforeSightingTime,
        ).toHaveBeenCalledWith(expect.anything(), mockManager);
    });

    it('invalidate: lock の後に無効になっていたら already_invalidated・保存も合図もしない', async () => {
        mockOperationSightingQuery.findOneById
            .mockResolvedValueOnce({ ...baseDto })
            .mockResolvedValueOnce({ ...baseDto, invalidation: invalidated });

        const error = await service.invalidate(params).catch((e) => e);

        expect(error).toBeInstanceOf(UseCaseError);
        expect(error.context.reason).toBe('already_invalidated');
        expect(mockSave).not.toHaveBeenCalled();
        expect(mockSignalSend).not.toHaveBeenCalled();
    });

    it('restore: lock の後に manager で目撃・キャッシュを読み直す', async () => {
        const order: string[] = [];
        mockOperationSightingQuery.findOneById.mockImplementation(
            async (_p: any, manager?: any) => {
                order.push(manager ? 'reread' : 'first-read');
                return { ...baseDto, invalidation: invalidated };
            },
        );
        mockLock.mockImplementation(async () => {
            order.push('lock');
        });
        mockOperationSightingLatestCacheQuery.findOneByFormationNumber.mockResolvedValue(
            null,
        );

        await service.restore(params);

        expect(order).toEqual(['first-read', 'lock', 'reread']);
        expect(mockLock).toHaveBeenCalledWith(mockManager, '8001');
        expect(
            mockOperationSightingLatestCacheQuery.findOneByFormationNumber,
        ).toHaveBeenCalledWith({ formationNumber: '8001' }, mockManager);
        expect(mockOperationSightingLatestCacheCommand.save).toHaveBeenCalled();
    });

    it('restore: 読み直した目撃が有効なら already_valid・保存しない', async () => {
        mockOperationSightingQuery.findOneById
            .mockResolvedValueOnce({ ...baseDto, invalidation: invalidated })
            .mockResolvedValueOnce({ ...baseDto });

        const error = await service.restore(params).catch((e) => e);

        expect(error).toBeInstanceOf(UseCaseError);
        expect(error.context.reason).toBe('already_valid');
        expect(mockSave).not.toHaveBeenCalled();
        expect(mockSignalSend).not.toHaveBeenCalled();
    });

    it('restore: 最初から有効な目撃も already_valid（素の Error にしない）', async () => {
        mockOperationSightingQuery.findOneById.mockResolvedValue({
            ...baseDto,
        });

        const error = await service.restore(params).catch((e) => e);

        expect(error).toBeInstanceOf(UseCaseError);
        expect(error.context.reason).toBe('already_valid');
        expect(mockSave).not.toHaveBeenCalled();
    });
});

describe('OperationSightingV3Service - post', () => {
    let service: OperationSightingV3Service;

    const baseParams = {
        agencyId: 'agency-uuid',
        formationOrVehicleNumber: '10708',
        operationNumber: '100',
        sightingTime: '2026-05-01T10:00:00+09:00',
        viewer: { ip: null, userAgent: null },
    };

    beforeEach(async () => {
        vi.clearAllMocks();
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

        const result = await service.post({ ...baseParams, userId: 'user-1' });

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
            userId: 'user-1',
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
            service.post({
                ...baseParams,
                userId: 'user-1',
                operationNumber: '11',
            }),
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
                userId: 'user-1',
                operationNumber: '11',
                sightingTime: '2026-05-01T09:00:00+09:00',
            }),
        ).rejects.toThrow('始発時刻の30分前より前の時刻は投稿できません');
    });

    it('post: 投稿者を同じトランザクションで記録し、保存の後に sighting の合図を送る', async () => {
        mockOperationQuery.findOneByCalendarIdAndOperationNumber.mockResolvedValue(
            { id: 'op-100', operationNumber: '100' },
        );
        mockSave.mockResolvedValue({ operationSightingId: 'new-id' });

        await service.post({ ...baseParams, userId: 'user-1' });

        expect(mockAuthorCreate).toHaveBeenCalledWith(
            { operationSightingId: 'new-id', userId: 'user-1' },
            mockManager,
        );
        expect(mockSignalSend).toHaveBeenCalledWith({ type: 'sighting' });
    });

    describe('端末の時計の進み', () => {
        const NOW = '2026-05-01T10:00:00.000+09:00';

        beforeEach(() => {
            vi.useFakeTimers({ toFake: ['Date'] });
            vi.setSystemTime(new Date(NOW));
            mockOperationQuery.findOneByCalendarIdAndOperationNumber.mockResolvedValue(
                { id: 'op-100', operationNumber: '100' },
            );
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('60 秒以内の未来の時刻は受け付け、受け付けた時刻で保存する', async () => {
            await service.post({
                ...baseParams,
                userId: 'user-1',
                sightingTime: '2026-05-01T10:00:59.000+09:00',
            });

            const saved = mockSave.mock.calls[0][0].props.sightingTime as Date;
            expect(saved.toISOString()).toBe(new Date(NOW).toISOString());
        });

        it('60 秒を超える未来の時刻は弾く', async () => {
            await expect(
                service.post({
                    ...baseParams,
                    userId: 'user-1',
                    sightingTime: '2026-05-01T10:01:01.000+09:00',
                }),
            ).rejects.toThrow('未来の時刻は指定できません');
            expect(mockSave).not.toHaveBeenCalled();
        });
    });

    it('post: userId が null なら投稿者を記録せず、合図は送る', async () => {
        mockOperationQuery.findOneByCalendarIdAndOperationNumber.mockResolvedValue(
            { id: 'op-100', operationNumber: '100' },
        );
        mockSave.mockResolvedValue({ operationSightingId: 'new-id' });

        const result = await service.post({ ...baseParams, userId: null });

        expect(result.operationSightingId).toBe('new-id');
        expect(mockAuthorCreate).not.toHaveBeenCalled();
        expect(mockSignalSend).toHaveBeenCalledWith({ type: 'sighting' });
    });

    it('post: userId と ip があればトランザクションの中で recordPost を呼ぶ', async () => {
        mockOperationQuery.findOneByCalendarIdAndOperationNumber.mockResolvedValue(
            { id: 'op-100', operationNumber: '100' },
        );
        mockSave.mockResolvedValue({ operationSightingId: 'new-id' });
        const calls: string[] = [];
        mockAuthorCreate.mockImplementation(async () => {
            calls.push('author');
        });
        mockRecordPost.mockImplementation(async () => {
            calls.push('trace');
        });
        mockDataSource.transaction.mockImplementation(async (fn: any) => {
            const result = await fn(mockManager);
            calls.push('commit');
            return result;
        });

        await service.post({
            ...baseParams,
            userId: 'user-1',
            viewer: { ip: '203.0.113.7', userAgent: 'UA' },
        });

        expect(mockRecordPost).toHaveBeenCalledWith(
            {
                userId: 'user-1',
                operationSightingId: 'new-id',
                ip: '203.0.113.7',
                userAgent: 'UA',
            },
            mockManager,
        );
        expect(calls).toEqual(['author', 'trace', 'commit']);
    });

    it('post: 投稿の記録を書いたら commit の後に purgeExpiredIfDue を呼ぶ', async () => {
        mockOperationQuery.findOneByCalendarIdAndOperationNumber.mockResolvedValue(
            { id: 'op-100', operationNumber: '100' },
        );
        mockSave.mockResolvedValue({ operationSightingId: 'new-id' });
        const calls: string[] = [];
        mockPurgeExpiredIfDue.mockImplementation(async () => {
            calls.push('purge');
        });
        mockDataSource.transaction.mockImplementation(async (fn: any) => {
            const result = await fn(mockManager);
            calls.push('commit');
            return result;
        });

        await service.post({
            ...baseParams,
            userId: 'user-1',
            viewer: { ip: '203.0.113.7', userAgent: null },
        });

        expect(calls).toEqual(['commit', 'purge']);
    });

    it('post: ip が null なら recordPost も purge も呼ばないが投稿は保存する', async () => {
        mockOperationQuery.findOneByCalendarIdAndOperationNumber.mockResolvedValue(
            { id: 'op-100', operationNumber: '100' },
        );
        mockSave.mockResolvedValue({ operationSightingId: 'new-id' });

        const result = await service.post({
            ...baseParams,
            userId: 'user-1',
            viewer: { ip: null, userAgent: 'UA' },
        });

        expect(result.operationSightingId).toBe('new-id');
        expect(mockAuthorCreate).toHaveBeenCalled();
        expect(mockRecordPost).not.toHaveBeenCalled();
        expect(mockPurgeExpiredIfDue).not.toHaveBeenCalled();
    });

    it('post: userId が null（匿名）なら ip があっても recordPost も purge も呼ばない', async () => {
        mockOperationQuery.findOneByCalendarIdAndOperationNumber.mockResolvedValue(
            { id: 'op-100', operationNumber: '100' },
        );
        mockSave.mockResolvedValue({ operationSightingId: 'new-id' });

        await service.post({
            ...baseParams,
            userId: null,
            viewer: { ip: '203.0.113.7', userAgent: 'UA' },
        });

        expect(mockRecordPost).not.toHaveBeenCalled();
        expect(mockPurgeExpiredIfDue).not.toHaveBeenCalled();
    });

    it('post: 保存に失敗したら合図を送らない', async () => {
        mockOperationQuery.findOneByCalendarIdAndOperationNumber.mockResolvedValue(
            { id: 'op-100', operationNumber: '100' },
        );
        mockSave.mockRejectedValue(new Error('db down'));

        await expect(
            service.post({ ...baseParams, userId: 'user-1' }),
        ).rejects.toThrow('db down');
        expect(mockSignalSend).not.toHaveBeenCalled();
    });
});

describe('OperationSightingV3Service - 過去の日の目撃の CDN 失効', () => {
    let service: OperationSightingV3Service;

    const postParams = {
        agencyId: 'agency-uuid',
        formationOrVehicleNumber: '10708',
        operationNumber: '100',
        userId: 'user-1',
        viewer: { ip: null, userAgent: null },
    };

    function buildDto(params: { sightingTime: Date; invalidated: boolean }) {
        return {
            operationSightingId: 'sighting-uuid',
            formationId: 'f-id',
            operationId: 'o-id',
            sightingTime: params.sightingTime,
            operation: { operationNumber: '61' },
            formation: { formationNumber: '8001' },
            invalidation: params.invalidated
                ? {
                      operationSightingId: 'sighting-uuid',
                      operationSightingInvalidationId: 'inv-id',
                  }
                : null,
            managementLogs: [],
        };
    }

    beforeEach(async () => {
        vi.clearAllMocks();
        mockInvalidate.mockResolvedValue(undefined);
        // 今は 2026-10-27 の運行日（4 時区切り）。Date だけ止める
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date('2026-10-27T04:30:00+09:00'));
        mockDataSource.transaction.mockImplementation(async (fn: any) =>
            fn(mockManager),
        );
        service = await buildService();

        mockCalendarQuery.findOneBySpecificDate.mockResolvedValue({
            id: 'cal-1',
        });
        mockOperationQuery.findOneByCalendarIdAndOperationNumber.mockResolvedValue(
            { id: 'op-100', operationNumber: '100' },
        );
        mockFormationQuery.findOneByAgencyIdAndFormationNumberAndDate.mockResolvedValue(
            { id: 'f-1', formationNumber: '10708' },
        );
        mockOperationSightingLatestCacheQuery.findOneByFormationNumber.mockResolvedValue(
            null,
        );
        mockSave.mockResolvedValue({ operationSightingId: 'sighting-uuid' });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('post: 前の運行日の目撃なら、その日のタグで失効し、合図の前に呼ぶ', async () => {
        await service.post({
            ...postParams,
            sightingTime: '2026-10-26T12:00:00+09:00',
        });

        expect(mockInvalidate).toHaveBeenCalledTimes(1);
        expect(mockInvalidate).toHaveBeenCalledWith({
            tags: ['sighting-date:2026-10-26'],
        });
        expect(mockInvalidate.mock.invocationCallOrder[0]).toBeLessThan(
            mockSignalSend.mock.invocationCallOrder[0],
        );
    });

    it('post: 今日の運行日の目撃なら、失効を呼ばない', async () => {
        // 05:00 の目撃を未来にしないため、今を 06:00 にずらす
        vi.setSystemTime(new Date('2026-10-27T06:00:00+09:00'));

        await service.post({
            ...postParams,
            sightingTime: '2026-10-27T05:00:00+09:00',
        });

        expect(mockInvalidate).not.toHaveBeenCalled();
        expect(mockSignalSend).toHaveBeenCalledWith({ type: 'sighting' });
    });

    it('post: 保存に失敗したら失効を呼ばない', async () => {
        mockSave.mockRejectedValue(new Error('db down'));

        await expect(
            service.post({
                ...postParams,
                sightingTime: '2026-10-26T12:00:00+09:00',
            }),
        ).rejects.toThrow('db down');
        expect(mockInvalidate).not.toHaveBeenCalled();
    });

    it('invalidate: 読んだ目撃が前の運行日なら、その日のタグで失効し、合図の前に呼ぶ', async () => {
        mockOperationSightingQuery.findOneById.mockResolvedValue(
            buildDto({
                sightingTime: new Date('2026-10-26T12:00:00+09:00'),
                invalidated: false,
            }),
        );

        await service.invalidate({
            operationSightingId: 'sighting-uuid',
            userId: 'u1',
            reason: 'test',
        });

        expect(mockInvalidate).toHaveBeenCalledTimes(1);
        expect(mockInvalidate).toHaveBeenCalledWith({
            tags: ['sighting-date:2026-10-26'],
        });
        expect(mockInvalidate.mock.invocationCallOrder[0]).toBeLessThan(
            mockSignalSend.mock.invocationCallOrder[0],
        );
    });

    it('invalidate: 読んだ目撃が今日の運行日なら、失効を呼ばない', async () => {
        mockOperationSightingQuery.findOneById.mockResolvedValue(
            buildDto({
                sightingTime: new Date('2026-10-27T04:10:00+09:00'),
                invalidated: false,
            }),
        );

        await service.invalidate({
            operationSightingId: 'sighting-uuid',
            userId: 'u1',
            reason: 'test',
        });

        expect(mockInvalidate).not.toHaveBeenCalled();
    });

    it('restore: 読んだ目撃が前の運行日なら、その日のタグで失効し、合図の前に呼ぶ', async () => {
        mockOperationSightingQuery.findOneById.mockResolvedValue(
            buildDto({
                sightingTime: new Date('2026-10-26T12:00:00+09:00'),
                invalidated: true,
            }),
        );

        await service.restore({
            operationSightingId: 'sighting-uuid',
            userId: 'u1',
            reason: 'test',
        });

        expect(mockInvalidate).toHaveBeenCalledTimes(1);
        expect(mockInvalidate).toHaveBeenCalledWith({
            tags: ['sighting-date:2026-10-26'],
        });
        expect(mockInvalidate.mock.invocationCallOrder[0]).toBeLessThan(
            mockSignalSend.mock.invocationCallOrder[0],
        );
    });

    it('restore: 読んだ目撃が今日の運行日なら、失効を呼ばない', async () => {
        mockOperationSightingQuery.findOneById.mockResolvedValue(
            buildDto({
                sightingTime: new Date('2026-10-27T04:10:00+09:00'),
                invalidated: true,
            }),
        );

        await service.restore({
            operationSightingId: 'sighting-uuid',
            userId: 'u1',
            reason: 'test',
        });

        expect(mockInvalidate).not.toHaveBeenCalled();
    });
});

describe('OperationSightingV3Service - 無効化（1 件・まとめて）', () => {
    let service: OperationSightingV3Service;

    function dtoOf(params: {
        id: string;
        sightingTime?: Date;
        invalidated?: boolean;
    }) {
        return {
            operationSightingId: params.id,
            formationId: 'f-id',
            operationId: 'o-id',
            sightingTime:
                params.sightingTime ?? new Date('2026-10-26T12:00:00+09:00'),
            operation: { operationNumber: '61' },
            formation: { formationNumber: '8001' },
            invalidation: params.invalidated
                ? {
                      operationSightingId: params.id,
                      operationSightingInvalidationId: 'inv-id',
                  }
                : null,
            managementLogs: [],
        };
    }

    /** id => dto（null は存在しない・Error は読む時点で落ちる） */
    function stubSightings(map: Record<string, any>) {
        mockOperationSightingQuery.findOneById.mockImplementation(
            async ({ id }: { id: string }) => {
                const v = map[id];
                if (v instanceof Error) {
                    throw v;
                }
                return v ?? null;
            },
        );
    }

    beforeEach(async () => {
        vi.clearAllMocks();
        mockInvalidate.mockResolvedValue(undefined);
        mockSignalSend.mockResolvedValue(undefined);
        // 今は 2026-10-27 の運行日（4 時区切り）。Date だけ止める
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date('2026-10-27T04:30:00+09:00'));
        mockDataSource.transaction.mockImplementation(async (fn: any) =>
            fn(mockManager),
        );
        service = await buildService();
        mockOperationSightingLatestCacheQuery.findOneByFormationNumber.mockResolvedValue(
            null,
        );
        mockSave.mockImplementation(async (domain: any) => ({
            operationSightingId: domain.id.value,
        }));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    const params = { userId: 'u1', reason: '荒らし' };

    it('invalidate: すでに無効な目撃は UseCaseError(already_invalidated)・保存も合図もしない', async () => {
        stubSightings({ a: dtoOf({ id: 'a', invalidated: true }) });

        const error = await service
            .invalidate({ operationSightingId: 'a', ...params })
            .catch((e) => e);

        expect(error).toBeInstanceOf(UseCaseError);
        expect(error.context).toEqual({
            operationSightingId: 'a',
            reason: 'already_invalidated',
        });
        expect(mockSave).not.toHaveBeenCalled();
        expect(mockSignalSend).not.toHaveBeenCalled();
        expect(mockInvalidate).not.toHaveBeenCalled();
    });

    it('invalidateMany: 無効・存在しない id は skipped、残りは invalidated', async () => {
        stubSightings({
            a: dtoOf({ id: 'a' }),
            c: dtoOf({ id: 'c', invalidated: true }),
            d: dtoOf({ id: 'd' }),
        });

        const result = await service.invalidateMany({
            ids: ['a', 'b', 'c', 'd'],
            ...params,
        });

        expect(result).toEqual({
            invalidated: ['a', 'd'],
            skipped: [
                { id: 'b', reason: 'not_found' },
                { id: 'c', reason: 'already_invalidated' },
            ],
            failed: null,
            pending: [],
        });
        expect(mockSave).toHaveBeenCalledTimes(2);
    });

    it('invalidateMany: 重複した id は 1 回だけ処理する', async () => {
        stubSightings({ a: dtoOf({ id: 'a' }), b: dtoOf({ id: 'b' }) });

        const result = await service.invalidateMany({
            ids: ['a', 'b', 'a'],
            ...params,
        });

        expect(result.invalidated).toEqual(['a', 'b']);
        // 1 件につき、最初の読みと lock の後の読み直しの 2 回。重複した id は処理しない
        expect(mockOperationSightingQuery.findOneById).toHaveBeenCalledTimes(4);
    });

    it('invalidateMany: 予期しない例外で止まり、failed に入れ、未処理は pending に残す', async () => {
        stubSightings({
            a: dtoOf({ id: 'a' }),
            b: dtoOf({ id: 'b' }),
            c: new Error('db down'),
            d: dtoOf({ id: 'd' }),
            e: dtoOf({ id: 'e' }),
        });

        const result = await service.invalidateMany({
            ids: ['a', 'b', 'c', 'd', 'e'],
            ...params,
        });

        expect(result).toEqual({
            invalidated: ['a', 'b'],
            skipped: [],
            failed: { id: 'c', message: INVALIDATE_MANY_UNEXPECTED_MESSAGE },
            pending: ['d', 'e'],
        });
        // 無効にできた分の合図は送る
        expect(mockSignalSend).toHaveBeenCalledTimes(1);
    });

    it('invalidateMany: 予期しない例外は stack と目撃の id を error ログに残し、内部の文言は応答に出さない', async () => {
        const logError = vi
            .spyOn(Logger.prototype, 'error')
            .mockImplementation(() => undefined);
        const boom = new Error('relation "x" does not exist');
        stubSightings({ a: dtoOf({ id: 'a' }), b: boom });

        const result = await service.invalidateMany({
            ids: ['a', 'b'],
            ...params,
        });

        expect(result.failed).toEqual({
            id: 'b',
            message: INVALIDATE_MANY_UNEXPECTED_MESSAGE,
        });
        expect(JSON.stringify(result)).not.toContain('relation');
        expect(logError).toHaveBeenCalledTimes(1);
        const [message, stack] = logError.mock.calls[0];
        expect(message).toContain('operationSightingId: b');
        expect(message).toContain('relation "x" does not exist');
        expect(stack).toBe(boom.stack);
        logError.mockRestore();
    });

    it('invalidateMany: skipped（not_found・already_invalidated）はログに残さない', async () => {
        const logError = vi
            .spyOn(Logger.prototype, 'error')
            .mockImplementation(() => undefined);
        stubSightings({ c: dtoOf({ id: 'c', invalidated: true }) });

        await service.invalidateMany({ ids: ['b', 'c'], ...params });

        expect(logError).not.toHaveBeenCalled();
        logError.mockRestore();
    });

    it('invalidateMany: not_found・already_invalidated 以外の UseCaseError も failed で止まる', async () => {
        stubSightings({
            a: dtoOf({ id: 'a' }),
            b: new UseCaseError('だめ', { reason: 'other' }),
            c: dtoOf({ id: 'c' }),
        });

        const result = await service.invalidateMany({
            ids: ['a', 'b', 'c'],
            ...params,
        });

        expect(result.invalidated).toEqual(['a']);
        expect(result.failed).toEqual({ id: 'b', message: 'だめ' });
        expect(result.pending).toEqual(['c']);
    });

    it('invalidateMany: 時間の予算を超えたら新しい件を始めず、残りを pending に入れる', async () => {
        stubSightings({
            a: dtoOf({ id: 'a' }),
            b: dtoOf({ id: 'b' }),
            c: dtoOf({ id: 'c' }),
        });
        // 開始 0・a の前 0・b の前で予算ちょうど
        const now = vi
            .fn<() => number>()
            .mockReturnValueOnce(0)
            .mockReturnValueOnce(0)
            .mockReturnValue(INVALIDATE_MANY_TIME_BUDGET_MS);

        const result = await service.invalidateMany({
            ids: ['a', 'b', 'c'],
            ...params,
            now,
        });

        expect(result).toEqual({
            invalidated: ['a'],
            skipped: [],
            failed: null,
            pending: ['b', 'c'],
        });
        expect(mockSignalSend).toHaveBeenCalledTimes(1);
    });

    it('invalidateMany: 合図は最後に 1 回だけ（socket 1 回・CDN は重ならない日付で 1 回）', async () => {
        stubSightings({
            a: dtoOf({
                id: 'a',
                sightingTime: new Date('2026-10-26T12:00:00+09:00'),
            }),
            b: dtoOf({
                id: 'b',
                sightingTime: new Date('2026-10-26T15:00:00+09:00'),
            }),
            c: dtoOf({
                id: 'c',
                sightingTime: new Date('2026-10-25T12:00:00+09:00'),
            }),
            d: dtoOf({
                id: 'd',
                sightingTime: new Date('2026-10-27T04:10:00+09:00'),
            }),
        });

        await service.invalidateMany({ ids: ['a', 'b', 'c', 'd'], ...params });

        expect(mockSignalSend).toHaveBeenCalledTimes(1);
        expect(mockSignalSend).toHaveBeenCalledWith({ type: 'sighting' });
        expect(mockInvalidate).toHaveBeenCalledTimes(1);
        expect(mockInvalidate).toHaveBeenCalledWith({
            tags: ['sighting-date:2026-10-26', 'sighting-date:2026-10-25'],
        });
    });

    it('invalidateMany: 1 件も無効にしなければ合図を送らない', async () => {
        stubSightings({ c: dtoOf({ id: 'c', invalidated: true }) });

        const result = await service.invalidateMany({
            ids: ['b', 'c'],
            ...params,
        });

        expect(result.invalidated).toEqual([]);
        expect(mockSignalSend).not.toHaveBeenCalled();
        expect(mockInvalidate).not.toHaveBeenCalled();
    });
});
