import { UserRoleChangeCommand } from '../infrastructure/command/user-role-change.command.js';
import { UserRoleChangeService } from './user-role-change.service.js';

describe('UserRoleChangeService', () => {
    it('渡された manager のまま command に流す', async () => {
        const command = { apply: vi.fn().mockResolvedValue(undefined) };
        const service = new UserRoleChangeService(
            command as unknown as UserRoleChangeCommand,
        );
        const manager = {};
        const change = {
            userId: 'u1',
            changedBy: 'm1',
            fromRole: 'reporter',
            toRole: 'viewer',
            reason: 'spam',
        };
        await service.apply(change, manager as never);
        expect(command.apply).toHaveBeenCalledWith(change, manager);
    });
});
