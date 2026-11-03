import { UniqueEntityId } from '../../../../core/classes/unique-entity-id.js';
import { UserRoleChanges } from '../../domain/user-role-change.domain.js';
import { UserRoleValue } from '../../domain/user-role-value.domain.js';
import { User } from '../../domain/user.domain.js';
import { ProfileModel } from '../models/profile.model.js';
import { UserRoleChangeModel } from '../models/user-role-change.model.js';
import { UserCommand } from './user.command.js';

const buildQueryBuilder = () => {
    const execute = vi.fn().mockResolvedValue({});
    const qb = {
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        into: vi.fn().mockReturnThis(),
        values: vi.fn().mockReturnThis(),
        execute,
    };
    return { qb, execute, manager: { createQueryBuilder: vi.fn(() => qb) } };
};

const createUser = (role: string) =>
    User.create(
        {
            role: UserRoleValue.create(role),
            lastBanFromRole: null,
            roleChanges: UserRoleChanges.create(),
        },
        new UniqueEntityId('u1'),
    );

describe('UserCommand', () => {
    it('BAN した User は、profiles.role の更新と user_role_changes の追加を渡された manager で流す', async () => {
        const { qb, execute, manager } = buildQueryBuilder();
        const user = createUser('reporter');
        user.ban({ userId: 'm1' }, 'spam');

        await new UserCommand().save(user, manager as never);

        expect(qb.update).toHaveBeenCalledWith(ProfileModel);
        expect(qb.set).toHaveBeenCalledWith({ role: 'viewer' });
        expect(qb.where).toHaveBeenCalledWith('user_id = :userId', {
            userId: 'u1',
        });
        expect(qb.into).toHaveBeenCalledWith(UserRoleChangeModel);
        expect(qb.values).toHaveBeenCalledWith({
            id: user.props.roleChanges.getNewItems()[0].id.value,
            userId: 'u1',
            changedBy: 'm1',
            fromRole: 'reporter',
            toRole: 'viewer',
            reason: 'spam',
        });
        expect(execute).toHaveBeenCalledTimes(2);
    });

    it('理由なしの解除は reason: null で追加する', async () => {
        const { qb, manager } = buildQueryBuilder();
        const user = User.create(
            {
                role: UserRoleValue.create('viewer'),
                lastBanFromRole: UserRoleValue.create('editor'),
                roleChanges: UserRoleChanges.create(),
            },
            new UniqueEntityId('u1'),
        );
        user.unban({ userId: 'm1' }, null);

        await new UserCommand().save(user, manager as never);

        expect(qb.set).toHaveBeenCalledWith({ role: 'editor' });
        expect(qb.values).toHaveBeenCalledWith(
            expect.objectContaining({
                fromRole: 'viewer',
                toRole: 'editor',
                reason: null,
            }),
        );
    });

    it('新しく足した変更が無ければ user_role_changes には書かない', async () => {
        const { qb, execute, manager } = buildQueryBuilder();

        await new UserCommand().save(createUser('reporter'), manager as never);

        expect(qb.insert).not.toHaveBeenCalled();
        expect(execute).toHaveBeenCalledTimes(1);
    });
});
