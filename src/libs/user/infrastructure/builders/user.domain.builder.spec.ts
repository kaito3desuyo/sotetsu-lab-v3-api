import { UnexpectedError } from '../../../../core/classes/unexpected-error.js';
import { UserDomainBuilder } from './user.domain.builder.js';

describe('UserDomainBuilder', () => {
    it('profiles の行と直近の BAN の from_role から User を組む（役割の変更は空）', () => {
        const user = UserDomainBuilder.buildFromRow({
            userId: 'u-1',
            role: 'viewer',
            lastBanFromRole: 'editor',
        });

        expect(user.id.value).toBe('u-1');
        expect(user.props.role.value).toBe('viewer');
        expect(user.props.lastBanFromRole?.value).toBe('editor');
        expect(user.props.roleChanges.getNewItems()).toEqual([]);
    });

    it('BAN の記録が無ければ lastBanFromRole は null', () => {
        const user = UserDomainBuilder.buildFromRow({
            userId: 'u-1',
            role: 'reporter',
            lastBanFromRole: null,
        });
        expect(user.props.lastBanFromRole).toBeNull();
    });

    it('知らない役割の行は UnexpectedError', () => {
        expect(() =>
            UserDomainBuilder.buildFromRow({
                userId: 'u-1',
                role: 'reader',
                lastBanFromRole: null,
            }),
        ).toThrow(UnexpectedError);
    });
});
