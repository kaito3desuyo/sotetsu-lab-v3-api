import type { Mock } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CalendarDateCommand } from '../infrastructure/command/calendar-date.command.js';
import { CalendarDateQuery } from '../infrastructure/queries/calendar-date.query.js';
import { CalendarDateV3Service } from './calendar-date.v3.service.js';

describe('CalendarDateV3Service', () => {
    let service: CalendarDateV3Service;
    let findMany: Mock;
    let create: Mock;
    let deleteOneById: Mock;

    beforeEach(async () => {
        findMany = vi.fn();
        create = vi.fn();
        deleteOneById = vi.fn();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CalendarDateV3Service,
                { provide: CalendarDateQuery, useValue: { findMany } },
                {
                    provide: CalendarDateCommand,
                    useValue: { create, deleteOneById },
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

    it('create は CalendarDateCommand.create に委譲する', async () => {
        create.mockResolvedValue({ id: 'new-id' });

        const result = await service.create({
            calendarId: 'calendar-1',
            date: '2027-07-20',
            exceptionType: 1,
        });

        expect(create).toHaveBeenCalledWith({
            calendarId: 'calendar-1',
            date: '2027-07-20',
            exceptionType: 1,
        });
        expect(result).toEqual({ id: 'new-id' });
    });

    it('deleteOneById は CalendarDateCommand.deleteOneById に委譲する', async () => {
        deleteOneById.mockResolvedValue(undefined);

        await service.deleteOneById({ id: 'target-id' });

        expect(deleteOneById).toHaveBeenCalledWith({ id: 'target-id' });
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
