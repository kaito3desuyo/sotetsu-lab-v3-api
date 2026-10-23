import {
    ExecutionContext,
    ForbiddenException,
    UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { FeatureFlags } from '../feature-flag/feature-flags.js';
import { RBAC_KEY } from './rbac.decorator.js';
import { RBAC_WHEN_FLAG_KEY } from './rbac-when-flag.decorator.js';
import { RBACGuard } from './rbac.guard.js';
import { Role } from './role.enum.js';

const contextWith = (auth: unknown) =>
    ({
        getHandler: () => undefined,
        getClass: () => undefined,
        switchToHttp: () => ({ getRequest: () => ({ auth }) }),
    }) as unknown as ExecutionContext;

const isEnabled = vi.fn();

const guardRequiring = (roles: Role[] | undefined, flagKey?: string) => {
    const reflector = {
        getAllAndOverride: (key: string) =>
            key === RBAC_KEY
                ? roles
                : key === RBAC_WHEN_FLAG_KEY
                  ? flagKey
                  : undefined,
    } as unknown as Reflector;
    return new RBACGuard(reflector, { isEnabled } as unknown as FeatureFlags);
};

describe('RBACGuard', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('@RBAC が無ければ誰でも通す', async () => {
        await expect(
            guardRequiring(undefined).canActivate(contextWith(undefined)),
        ).resolves.toBe(true);
    });

    it('@RBAC があってトークンが無ければ 401', async () => {
        await expect(
            guardRequiring([Role.EDITOR]).canActivate(contextWith(undefined)),
        ).rejects.toThrow(UnauthorizedException);
    });

    it('役割が足りなければ 403', async () => {
        await expect(
            guardRequiring([Role.EDITOR, Role.MANAGER]).canActivate(
                contextWith({ userId: 'u', role: Role.REPORTER }),
            ),
        ).rejects.toThrow(ForbiddenException);
    });

    it('役割が無ければ 403', async () => {
        await expect(
            guardRequiring([Role.EDITOR]).canActivate(
                contextWith({ userId: 'u', role: null }),
            ),
        ).rejects.toThrow(ForbiddenException);
    });

    it('役割が合えば通す', async () => {
        await expect(
            guardRequiring([Role.EDITOR, Role.MANAGER]).canActivate(
                contextWith({ userId: 'u', role: Role.MANAGER }),
            ),
        ).resolves.toBe(true);
    });

    it('@RBACWhenFlag が無い口は、フラグを見ずに今までどおり', async () => {
        await expect(
            guardRequiring([Role.EDITOR]).canActivate(
                contextWith({ userId: 'u', role: null }),
            ),
        ).rejects.toThrow(ForbiddenException);
        expect(isEnabled).not.toHaveBeenCalled();
    });

    describe('@RBACWhenFlag', () => {
        const guard = () => guardRequiring([Role.REPORTER], 'x');

        it('フラグ off なら役割が null でも通す', async () => {
            isEnabled.mockResolvedValue(false);
            await expect(
                guard().canActivate(contextWith({ userId: 'u', role: null })),
            ).resolves.toBe(true);
            expect(isEnabled).toHaveBeenCalledWith('x');
        });

        it('フラグ on で役割が null なら 403', async () => {
            isEnabled.mockResolvedValue(true);
            await expect(
                guard().canActivate(contextWith({ userId: 'u', role: null })),
            ).rejects.toThrow(ForbiddenException);
        });

        it('フラグ on で役割が合えば通す', async () => {
            isEnabled.mockResolvedValue(true);
            await expect(
                guard().canActivate(
                    contextWith({ userId: 'u', role: Role.REPORTER }),
                ),
            ).resolves.toBe(true);
        });

        it('req.auth が無ければ、フラグに関わらず 401', async () => {
            isEnabled.mockResolvedValue(false);
            await expect(
                guard().canActivate(contextWith(undefined)),
            ).rejects.toThrow(UnauthorizedException);
            expect(isEnabled).not.toHaveBeenCalled();
        });

        it('フラグを読めなければ例外をそのまま投げる', async () => {
            isEnabled.mockRejectedValue(new Error('db down'));
            await expect(
                guard().canActivate(contextWith({ userId: 'u', role: null })),
            ).rejects.toThrow('db down');
        });
    });
});
