import type { Mock } from 'vitest';
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
});
