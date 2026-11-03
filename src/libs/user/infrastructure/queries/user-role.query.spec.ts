import { UserRoleQuery } from './user-role.query.js';

describe('UserRoleQuery', () => {
    const getRawOne = vi.fn();
    const qb = {
        select: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        getRawOne,
    };
    const repository = { createQueryBuilder: vi.fn(() => qb) };
    let query: UserRoleQuery;

    beforeEach(() => {
        vi.clearAllMocks();
        qb.select.mockReturnThis();
        qb.where.mockReturnThis();
        repository.createQueryBuilder.mockReturnValue(qb);
        query = new UserRoleQuery(repository as never);
    });

    it('profiles.role を user_id で引いて返す', async () => {
        getRawOne.mockResolvedValue({ role: 'editor' });
        await expect(query.findRoleValue('u1')).resolves.toBe('editor');
        expect(qb.where).toHaveBeenCalledWith('p.userId = :userId', {
            userId: 'u1',
        });
    });

    it('行が無ければ null', async () => {
        getRawOne.mockResolvedValue(undefined);
        await expect(query.findRoleValue('u1')).resolves.toBeNull();
    });
});
