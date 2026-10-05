import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QueryFailedError } from 'typeorm';
import { UseCaseError } from 'src/core/classes/custom-error';
import { CalendarDateModel } from '../models/calendar-date.model';
import { CalendarDateCommand } from './calendar-date.command';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyMock = jest.MockedFunction<(...args: any[]) => any>;

function buildUniqueViolationError(): QueryFailedError {
    const error = new QueryFailedError('INSERT ...', [], new Error('duplicate key'));
    (error as unknown as { code: string }).code = '23505';
    return error;
}

describe('CalendarDateCommand', () => {
    let create: AnyMock;
    let save: AnyMock;
    let deleteFn: AnyMock;
    let command: CalendarDateCommand;

    beforeEach(async () => {
        create = jest.fn().mockImplementation((entity) => entity);
        save = jest.fn();
        deleteFn = jest.fn();

        const mockRepository = {
            create,
            save,
            delete: deleteFn,
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CalendarDateCommand,
                {
                    provide: getRepositoryToken(CalendarDateModel),
                    useValue: mockRepository,
                },
            ],
        }).compile();

        command = module.get<CalendarDateCommand>(CalendarDateCommand);
    });

    it('正常に登録できる場合は DTO を返す', async () => {
        save.mockResolvedValue({
            id: 'new-id',
            calendarId: 'calendar-1',
            date: '2027-07-20',
            exceptionType: 2,
            memo: '祝日',
        });

        const result = await command.create({
            calendarId: 'calendar-1',
            date: '2027-07-20',
            exceptionType: 2,
            memo: '祝日',
        });

        expect(result.id).toBe('new-id');
    });

    it('UNIQUE(calendar_id, date) 違反時は UseCaseError を投げる（重複登録の拒否）', async () => {
        save.mockRejectedValue(buildUniqueViolationError());

        await expect(
            command.create({
                calendarId: 'calendar-1',
                date: '2027-07-20',
                exceptionType: 2,
            }),
        ).rejects.toBeInstanceOf(UseCaseError);
    });

    it('UNIQUE 違反以外のエラーはそのまま再送出する', async () => {
        save.mockRejectedValue(new Error('unexpected'));

        await expect(
            command.create({
                calendarId: 'calendar-1',
                date: '2027-07-20',
                exceptionType: 2,
            }),
        ).rejects.toThrow('unexpected');
    });

    it('deleteOneById は対象が存在しない場合 UseCaseError を投げる', async () => {
        deleteFn.mockResolvedValue({ affected: 0 });

        await expect(
            command.deleteOneById({ id: 'not-found-id' }),
        ).rejects.toBeInstanceOf(UseCaseError);
    });

    it('deleteOneById は対象が存在する場合エラーを投げない', async () => {
        deleteFn.mockResolvedValue({ affected: 1 });

        await expect(
            command.deleteOneById({ id: 'existing-id' }),
        ).resolves.toBeUndefined();
    });
});
