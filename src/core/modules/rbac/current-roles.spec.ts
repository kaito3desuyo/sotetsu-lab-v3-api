import { CurrentRoles } from './current-roles.js';
import { Role } from './role.enum.js';

describe('CurrentRoles', () => {
    const getRawOne = vi.fn();
    const qb = {
        select: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        getRawOne,
    };
    const repository = { createQueryBuilder: vi.fn(() => qb) };
    let currentRoles: CurrentRoles;

    beforeEach(() => {
        vi.clearAllMocks();
        qb.select.mockReturnThis();
        qb.where.mockReturnThis();
        repository.createQueryBuilder.mockReturnValue(qb);
        currentRoles = new CurrentRoles(repository as never);
    });

    it('profiles.role を返す', async () => {
        getRawOne.mockResolvedValue({ role: 'editor' });
        await expect(currentRoles.findRole('u1')).resolves.toBe(Role.EDITOR);
        expect(qb.where).toHaveBeenCalledWith('p.userId = :userId', {
            userId: 'u1',
        });
    });

    it('行が無ければ null', async () => {
        getRawOne.mockResolvedValue(undefined);
        await expect(currentRoles.findRole('u1')).resolves.toBeNull();
    });

    it('知らない役割の文字列は null', async () => {
        getRawOne.mockResolvedValue({ role: 'reader' });
        await expect(currentRoles.findRole('u1')).resolves.toBeNull();
    });

    it('キャッシュせず毎回引く', async () => {
        getRawOne.mockResolvedValue({ role: 'viewer' });
        await currentRoles.findRole('u1');
        await currentRoles.findRole('u1');
        expect(getRawOne).toHaveBeenCalledTimes(2);
    });
});
