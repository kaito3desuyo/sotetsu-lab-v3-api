import { UnexpectedError } from '../../../core/classes/unexpected-error.js';
import { Role } from '../../../core/modules/rbac/role.enum.js';
import { UserRoleValue } from './user-role-value.domain.js';

describe('UserRoleValue', () => {
    it.each(Object.values(Role))('%s は役割として受け取る', (role) => {
        expect(UserRoleValue.create(role).value).toBe(role);
    });

    it.each(['reader', 'admin', '', 'Viewer'])(
        '知らない文字列 %j は UnexpectedError',
        (role) => {
            expect(() => UserRoleValue.create(role)).toThrow(UnexpectedError);
        },
    );

    it('viewer だけが BAN 済み', () => {
        expect(UserRoleValue.create(Role.VIEWER).isBanned()).toBe(true);
        for (const role of [Role.REPORTER, Role.EDITOR, Role.MANAGER]) {
            expect(UserRoleValue.create(role).isBanned()).toBe(false);
        }
    });

    it('manager だけが MANAGER', () => {
        expect(UserRoleValue.create(Role.MANAGER).isManager()).toBe(true);
        for (const role of [Role.VIEWER, Role.REPORTER, Role.EDITOR]) {
            expect(UserRoleValue.create(role).isManager()).toBe(false);
        }
    });

    it('banned() は viewer・defaultRestored() は reporter', () => {
        expect(UserRoleValue.banned().value).toBe('viewer');
        expect(UserRoleValue.defaultRestored().value).toBe('reporter');
    });

    it('同じ役割は等しい', () => {
        expect(
            UserRoleValue.create('editor').isEqual(
                UserRoleValue.create('editor'),
            ),
        ).toBe(true);
        expect(
            UserRoleValue.create('editor').isEqual(
                UserRoleValue.create('manager'),
            ),
        ).toBe(false);
    });
});
