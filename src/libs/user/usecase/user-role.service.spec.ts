import { Role } from '../../../core/modules/rbac/role.enum.js';
import { UserRoleQuery } from '../infrastructure/queries/user-role.query.js';
import { UserRoleService } from './user-role.service.js';

describe('UserRoleService', () => {
    const findRoleValue = vi.fn();
    let service: UserRoleService;

    beforeEach(() => {
        vi.clearAllMocks();
        service = new UserRoleService({
            findRoleValue,
        } as unknown as UserRoleQuery);
    });

    it('profiles.role を返す', async () => {
        findRoleValue.mockResolvedValue('editor');
        await expect(service.findRole('u1')).resolves.toBe(Role.EDITOR);
        expect(findRoleValue).toHaveBeenCalledWith('u1');
    });

    it('行が無ければ null', async () => {
        findRoleValue.mockResolvedValue(null);
        await expect(service.findRole('u1')).resolves.toBeNull();
    });

    it('知らない役割の文字列は null', async () => {
        findRoleValue.mockResolvedValue('reader');
        await expect(service.findRole('u1')).resolves.toBeNull();
    });

    it('キャッシュせず毎回引く', async () => {
        findRoleValue.mockResolvedValue('viewer');
        await service.findRole('u1');
        await service.findRole('u1');
        expect(findRoleValue).toHaveBeenCalledTimes(2);
    });
});
