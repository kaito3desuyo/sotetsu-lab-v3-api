import { TripBlockModel } from '../models/trip-block.model';
import { TripOperationListModel } from 'src/libs/trip/infrastructure/models/trip-operation-list.model';
import { TripBlockCommand } from './trip-block.command';
import { TripBlockModelBuilder } from '../builders/trip-block.model.builder';
import { TripBlockDtoBuilder } from '../builders/trip-block.dto.builder';

describe('TripBlockCommand.replaceOneTripBlockByDomain - 次の区間の付け替え', () => {
    const calls: string[] = [];
    const existing = [
        { id: 'a', nextTripOperationListId: 'T' },
        { id: 'b', nextTripOperationListId: null },
    ];
    const updateBuilder = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockImplementation((v) => {
            calls.push(`clear:${JSON.stringify(v)}`);
            return updateBuilder;
        }),
        where: jest.fn().mockImplementation((_s, p) => {
            calls.push(
                p.ids
                    ? `where:${p.ids.join(',')}`
                    : `target:${p.targets.join(',')}`,
            );
            return updateBuilder;
        }),
        andWhere: jest.fn().mockImplementation((_s, p) => {
            calls.push(`except:${p.owners.join(',')}`);
            return updateBuilder;
        }),
        select: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(existing),
        execute: jest.fn().mockResolvedValue(undefined),
    };
    const tripBlockRepo = { save: jest.fn() };
    const manager = {
        getRepository: jest
            .fn()
            .mockImplementation((m) =>
                m === TripOperationListModel
                    ? { createQueryBuilder: () => updateBuilder }
                    : tripBlockRepo,
            ),
    };
    const repository = {
        manager: {
            transaction: jest.fn().mockImplementation((cb) => cb(manager)),
        },
        save: jest.fn(),
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
        jest.spyOn(TripBlockModelBuilder, 'buildFromDomain').mockReturnValue(
            model as never,
        );
        jest.spyOn(TripBlockDtoBuilder, 'buildFromModel').mockReturnValue(
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
