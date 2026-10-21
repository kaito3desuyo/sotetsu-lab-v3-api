import { TripBlockModel } from '../models/trip-block.model.js';
import { TripOperationListModel } from '../../../trip/infrastructure/models/trip-operation-list.model.js';
import { TripBlockCommand } from './trip-block.command.js';
import { TripBlockModelBuilder } from '../builders/trip-block.model.builder.js';
import { TripBlockDtoBuilder } from '../builders/trip-block.dto.builder.js';

describe('TripBlockCommand.replaceOneTripBlockByDomain - 次の区間の付け替え', () => {
    const calls: string[] = [];
    const existing = [
        { id: 'a', nextTripOperationListId: 'T' },
        { id: 'b', nextTripOperationListId: null },
    ];
    const updateBuilder = {
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockImplementation((v) => {
            calls.push(`clear:${JSON.stringify(v)}`);
            return updateBuilder;
        }),
        where: vi.fn().mockImplementation((_s, p) => {
            calls.push(
                p.ids
                    ? `where:${p.ids.join(',')}`
                    : `target:${p.targets.join(',')}`,
            );
            return updateBuilder;
        }),
        andWhere: vi.fn().mockImplementation((_s, p) => {
            calls.push(`except:${p.owners.join(',')}`);
            return updateBuilder;
        }),
        select: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue(existing),
        execute: vi.fn().mockResolvedValue(undefined),
    };
    const tripBlockRepo = { save: vi.fn() };
    const manager = {
        getRepository: vi
            .fn()
            .mockImplementation((m) =>
                m === TripOperationListModel
                    ? { createQueryBuilder: () => updateBuilder }
                    : tripBlockRepo,
            ),
    };
    const repository = {
        manager: {
            transaction: vi.fn().mockImplementation((cb) => cb(manager)),
        },
        save: vi.fn(),
    };

    it('次の区間が変わる区間を先に null にしてから最終値を保存する（同じトランザクション内）', async () => {
        const model = {
            trips: [
                {
                    tripOperationLists: [
                        { id: 'a', nextTripOperationListId: null },
                        { id: 'b', nextTripOperationListId: 'T' },
                    ],
                },
            ],
        };
        vi.spyOn(TripBlockModelBuilder, 'buildFromDomain').mockReturnValue(
            model as never,
        );
        vi.spyOn(TripBlockDtoBuilder, 'buildFromModel').mockReturnValue(
            {} as never,
        );
        tripBlockRepo.save.mockImplementation(async (m) => {
            calls.push('save');
            return m;
        });
        const command = Object.assign(
            Object.create(TripBlockCommand.prototype),
            { tripBlockRepository: repository },
        ) as TripBlockCommand;
        await command.replaceOneTripBlockByDomain({} as never);
        expect(repository.manager.transaction).toHaveBeenCalledTimes(1);
        expect(manager.getRepository).toHaveBeenCalledWith(TripBlockModel);
        expect(calls).toEqual([
            'where:a,b',
            'clear:{"nextTripOperationListId":null}',
            'where:a',
            // 送られてこない区間（消える区間など）が T を指していても外す
            'clear:{"nextTripOperationListId":null}',
            'target:T',
            'except:b',
            'save',
        ]);
    });
});
