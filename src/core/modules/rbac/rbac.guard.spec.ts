import {
    ExecutionContext,
    ForbiddenException,
    UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { FeatureFlags } from '../feature-flag/feature-flags.js';
import type { UserRoleService } from '../../../libs/user/usecase/user-role.service.js';
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
const findRole = vi.fn();

const guardRequiring = (roles: Role[] | undefined, flagKey?: string) => {
    const reflector = {
        getAllAndOverride: (key: string) =>
            key === RBAC_KEY
                ? roles
                : key === RBAC_WHEN_FLAG_KEY
                  ? flagKey
                  : undefined,
    } as unknown as Reflector;
    return new RBACGuard(
        reflector,
        { isEnabled } as unknown as FeatureFlags,
        { findRole } as unknown as UserRoleService,
    );
};

describe('RBACGuard', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        findRole.mockImplementation(async (): Promise<Role | null> => null);
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

    describe('役割をその場で読み直す', () => {
        it('JWT は reporter でも DB が viewer なら投稿は 403', async () => {
            findRole.mockResolvedValue(Role.VIEWER);
            await expect(
                guardRequiring([Role.REPORTER, Role.EDITOR]).canActivate(
                    contextWith({ userId: 'u', role: Role.REPORTER }),
                ),
            ).rejects.toThrow(ForbiddenException);
            expect(findRole).toHaveBeenCalledWith('u');
        });

        it('フラグ off でも DB が viewer なら 403', async () => {
            findRole.mockResolvedValue(Role.VIEWER);
            isEnabled.mockResolvedValue(false);
            await expect(
                guardRequiring([Role.REPORTER], 'x').canActivate(
                    contextWith({ userId: 'u', role: Role.REPORTER }),
                ),
            ).rejects.toThrow(ForbiddenException);
        });

        it('JWT が reporter で DB が editor に上がっていれば EDITOR の口を通す', async () => {
            findRole.mockResolvedValue(Role.EDITOR);
            await expect(
                guardRequiring([Role.EDITOR, Role.MANAGER]).canActivate(
                    contextWith({ userId: 'u', role: Role.REPORTER }),
                ),
            ).resolves.toBe(true);
        });

        it('匿名（role null）は DB を読まない', async () => {
            await expect(
                guardRequiring([Role.EDITOR]).canActivate(
                    contextWith({ userId: 'u', role: null }),
                ),
            ).rejects.toThrow(ForbiddenException);
            expect(findRole).not.toHaveBeenCalled();
        });

        it('profiles に行が無ければ（null）JWT の役割のまま', async () => {
            findRole.mockResolvedValue(null);
            await expect(
                guardRequiring([Role.REPORTER]).canActivate(
                    contextWith({ userId: 'u', role: Role.REPORTER }),
                ),
            ).resolves.toBe(true);
        });

        it('DB を読めなければ例外をそのまま投げる', async () => {
            findRole.mockRejectedValue(new Error('db down'));
            await expect(
                guardRequiring([Role.REPORTER]).canActivate(
                    contextWith({ userId: 'u', role: Role.REPORTER }),
                ),
            ).rejects.toThrow('db down');
        });
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
