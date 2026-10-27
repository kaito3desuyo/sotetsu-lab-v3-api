import type { MockedFunction } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, DeleteQueryBuilder, QueryFailedError } from 'typeorm';
import { ENTITIES } from '../../../../core/configs/entities.js';
import { TypeOrmNamingStrategy } from '../../../../core/configs/typeorm-naming-strategy.js';
import { UseCaseError } from '../../../../core/classes/custom-error.js';
import { CalendarDateModel } from '../models/calendar-date.model.js';
import { CalendarDateCommand } from './calendar-date.command.js';

type AnyMock = MockedFunction<(...args: any[]) => any>;

function buildUniqueViolationError(): QueryFailedError {
    const error = new QueryFailedError('INSERT ...', [], new Error('duplicate key'));
    (error as unknown as { code: string }).code = '23505';
    return error;
}

describe('CalendarDateCommand', () => {
    let create: AnyMock;
    let save: AnyMock;
    let execute: AnyMock;
    let where: AnyMock;
    let returning: AnyMock;
    let command: CalendarDateCommand;

    beforeEach(async () => {
        create = vi.fn().mockImplementation((entity) => entity);
        save = vi.fn();
        execute = vi.fn();
        returning = vi.fn().mockReturnValue({ execute });
        where = vi.fn().mockReturnValue({ returning });
        const deleteFn = vi.fn().mockReturnValue({ where });

        const mockRepository = {
            create,
            save,
            createQueryBuilder: vi.fn().mockReturnValue({ delete: deleteFn }),
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
        execute.mockResolvedValue({ raw: [], affected: 0 });

        await expect(
            command.deleteOneById({ id: 'not-found-id' }),
        ).rejects.toBeInstanceOf(UseCaseError);
    });

    it('deleteOneById は消した行の calendarId を返す', async () => {
        execute.mockResolvedValue({
            raw: [{ calendar_id: 'calendar-1' }],
            affected: 1,
        });

        await expect(
            command.deleteOneById({ id: 'existing-id' }),
        ).resolves.toEqual({ calendarId: 'calendar-1' });
        expect(where).toHaveBeenCalledWith('id = :id', { id: 'existing-id' });
        expect(returning).toHaveBeenCalledWith(['calendarId']);
    });
});

describe('CalendarDateCommand.deleteOneById が組み立てる SQL', () => {
    it('RETURNING "calendar_id" を含む（returning はプロパティ名で引くため、列名で渡すと黙って捨てられる）', async () => {
        // 接続はしない。メタデータを組み立てるだけで SQL を取り出す
        const dataSource = new DataSource({
            type: 'postgres',
            entities: ENTITIES,
            namingStrategy: new TypeOrmNamingStrategy(),
        });
        await (
            dataSource as unknown as { buildMetadatas(): Promise<void> }
        ).buildMetadatas();
        const repository = dataSource.getRepository(CalendarDateModel);
        const command = new CalendarDateCommand(repository);

        // execute は DB に繋ぐので差し替え、組み立てた SQL だけを受け取る
        let sql = '';
        vi.spyOn(DeleteQueryBuilder.prototype, 'execute').mockImplementation(
            async function (this: DeleteQueryBuilder<CalendarDateModel>) {
                [sql] = this.getQueryAndParameters();
                return { raw: [{ calendar_id: 'calendar-1' }] } as never;
            },
        );

        await command.deleteOneById({ id: 'target-id' });

        expect(sql).toBe(
            'DELETE FROM "calendar_dates" WHERE "id" = $1 RETURNING "calendar_id"',
        );
    });
});
