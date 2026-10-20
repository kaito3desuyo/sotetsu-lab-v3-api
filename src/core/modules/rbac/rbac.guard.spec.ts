import {
    ExecutionContext,
    ForbiddenException,
    UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RBACGuard } from './rbac.guard';
import { Role } from './role.enum';

const contextWith = (auth: unknown) =>
    ({
        getHandler: () => undefined,
        getClass: () => undefined,
        switchToHttp: () => ({ getRequest: () => ({ auth }) }),
    }) as unknown as ExecutionContext;

const guardRequiring = (roles: Role[] | undefined) => {
    const reflector = {
        getAllAndOverride: () => roles,
    } as unknown as Reflector;
    return new RBACGuard(reflector);
};

describe('RBACGuard', () => {
    it('@RBAC が無ければ誰でも通す', () => {
        expect(
            guardRequiring(undefined).canActivate(contextWith(undefined)),
        ).toBe(true);
    });

    it('@RBAC があってトークンが無ければ 401', () => {
        expect(() =>
            guardRequiring([Role.EDITOR]).canActivate(contextWith(undefined)),
        ).toThrow(UnauthorizedException);
    });

    it('役割が足りなければ 403', () => {
        expect(() =>
            guardRequiring([Role.EDITOR, Role.MANAGER]).canActivate(
                contextWith({ userId: 'u', role: Role.REPORTER }),
            ),
        ).toThrow(ForbiddenException);
    });

    it('役割が無ければ 403', () => {
        expect(() =>
            guardRequiring([Role.EDITOR]).canActivate(
                contextWith({ userId: 'u', role: null }),
            ),
        ).toThrow(ForbiddenException);
    });

    it('役割が合えば通す', () => {
        expect(
            guardRequiring([Role.EDITOR, Role.MANAGER]).canActivate(
                contextWith({ userId: 'u', role: Role.MANAGER }),
            ),
        ).toBe(true);
    });
});
