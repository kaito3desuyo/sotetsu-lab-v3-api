import { ProfileModel } from '../models/profile.model.js';
import { UserRoleChangeModel } from '../models/user-role-change.model.js';
import { UserRoleChangeCommand } from './user-role-change.command.js';

describe('UserRoleChangeCommand', () => {
    it('profiles.role の更新と user_role_changes の追加を渡された manager で流す', async () => {
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
        const manager = { createQueryBuilder: vi.fn(() => qb) };
        await new UserRoleChangeCommand().apply(
            {
                userId: 'u1',
                changedBy: 'm1',
                fromRole: 'reporter',
                toRole: 'viewer',
                reason: 'spam',
            },
            manager as never,
        );
        expect(qb.update).toHaveBeenCalledWith(ProfileModel);
        expect(qb.set).toHaveBeenCalledWith({ role: 'viewer' });
        expect(qb.where).toHaveBeenCalledWith('user_id = :userId', {
            userId: 'u1',
        });
        expect(qb.into).toHaveBeenCalledWith(UserRoleChangeModel);
        expect(qb.values).toHaveBeenCalledWith({
            userId: 'u1',
            changedBy: 'm1',
            fromRole: 'reporter',
            toRole: 'viewer',
            reason: 'spam',
        });
        expect(execute).toHaveBeenCalledTimes(2);
    });
});
