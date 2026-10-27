import type { Mock } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CdnInvalidation } from '../../../core/modules/cdn-invalidation/cdn-invalidation.js';
import { CalendarDateCommand } from '../infrastructure/command/calendar-date.command.js';
import { CalendarDateQuery } from '../infrastructure/queries/calendar-date.query.js';
import { CalendarDateV3Service } from './calendar-date.v3.service.js';

describe('CalendarDateV3Service', () => {
    let service: CalendarDateV3Service;
    let findMany: Mock;
    let create: Mock;
    let deleteOneById: Mock;
    let mockInvalidate: Mock;

    beforeEach(async () => {
        findMany = vi.fn();
        create = vi.fn();
        deleteOneById = vi.fn();
        mockInvalidate = vi.fn().mockResolvedValue(undefined);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CalendarDateV3Service,
                { provide: CalendarDateQuery, useValue: { findMany } },
                {
                    provide: CalendarDateCommand,
                    useValue: { create, deleteOneById },
                },
                {
                    provide: CdnInvalidation,
                    useValue: { invalidate: mockInvalidate },
                },
            ],
        }).compile();

        service = module.get<CalendarDateV3Service>(CalendarDateV3Service);
    });

    it('findMany は CalendarDateQuery.findMany に委譲する', async () => {
        findMany.mockResolvedValue([{ id: 'a' }]);

        const result = await service.findMany({ calendarId: 'calendar-1' });

        expect(findMany).toHaveBeenCalledWith({ calendarId: 'calendar-1' });
        expect(result).toEqual([{ id: 'a' }]);
    });

    it('create は CalendarDateCommand.create に委譲し、作った行のダイヤのタグで失効を呼ぶ', async () => {
        create.mockResolvedValue({ id: 'new-id', calendarId: 'Calendar-1' });

        const result = await service.create({
            calendarId: 'Calendar-1',
            date: '2027-07-20',
            exceptionType: 1,
        });

        expect(create).toHaveBeenCalledWith({
            calendarId: 'Calendar-1',
            date: '2027-07-20',
            exceptionType: 1,
        });
        expect(result).toEqual({ id: 'new-id', calendarId: 'Calendar-1' });
        expect(mockInvalidate).toHaveBeenCalledTimes(1);
        expect(mockInvalidate).toHaveBeenCalledWith({
            tags: ['calendar:calendar-1'],
        });
    });

    it('create で command が投げたら、失効を呼ばない', async () => {
        create.mockRejectedValue(new Error('duplicate'));

        await expect(
            service.create({
                calendarId: 'calendar-1',
                date: '2027-07-20',
                exceptionType: 1,
            }),
        ).rejects.toThrow('duplicate');
        expect(mockInvalidate).not.toHaveBeenCalled();
    });

    it('deleteOneById は command が返した calendarId のタグで失効を呼ぶ', async () => {
        deleteOneById.mockResolvedValue({ calendarId: 'Calendar-1' });

        await service.deleteOneById({ id: 'target-id' });

        expect(deleteOneById).toHaveBeenCalledWith({ id: 'target-id' });
        expect(mockInvalidate).toHaveBeenCalledTimes(1);
        expect(mockInvalidate).toHaveBeenCalledWith({
            tags: ['calendar:calendar-1'],
        });
    });

    it('deleteOneById で command が投げたら、失効を呼ばない', async () => {
        deleteOneById.mockRejectedValue(new Error('not found'));

        await expect(
            service.deleteOneById({ id: 'target-id' }),
        ).rejects.toThrow('not found');
        expect(mockInvalidate).not.toHaveBeenCalled();
    });

    it('findMany は fields[calendarDate] の項目と id だけを返す', async () => {
        findMany.mockResolvedValue([
            { id: 'a', date: '2026-11-03', exceptionType: 1, memo: null },
        ]);

        const result = await service.findMany({
            calendarId: 'calendar-1',
            fields: { calendarDate: 'date,memo' },
        });

        expect(findMany).toHaveBeenCalledWith({ calendarId: 'calendar-1' });
        expect(result).toEqual([{ id: 'a', date: '2026-11-03' }]);
    });

    it('findMany は include を 400 にし、query を呼ばない', async () => {
        await expect(service.findMany({ include: '' })).rejects.toThrow(
            new BadRequestException('この口は include を指定できない'),
        );
        expect(findMany).not.toHaveBeenCalled();
    });
});
