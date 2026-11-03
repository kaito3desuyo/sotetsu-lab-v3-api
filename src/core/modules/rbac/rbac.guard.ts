import {
    ExecutionContext,
    ForbiddenException,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { UserRoleService } from '../../../libs/user/usecase/user-role.service.js';
import { FeatureFlags } from '../feature-flag/feature-flags.js';
import { RBAC_KEY } from './rbac.decorator.js';
import { RBAC_WHEN_FLAG_KEY } from './rbac-when-flag.decorator.js';
import { Role } from './role.enum.js';

/**
 * @RBAC の付いた口だけ役割を見る。トークンが無ければ 401、役割が足りなければ 403。
 * 役割は JWT でなく profiles から毎回読み直す（BAN・昇格を即座に効かせるため）。読み直した役割が viewer なら、フラグに関係なく 403。
 * @RBACWhenFlag の付いた口は、そのフラグが off なら役割を見ずに通す（viewer を除く）。
 */
@Injectable()
export class RBACGuard {
    constructor(
        private reflector: Reflector,
        private featureFlags: FeatureFlags,
        private currentRoles: UserRoleService,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const targets = [context.getHandler(), context.getClass()];
        const requiredRoles = this.reflector.getAllAndOverride<Role[]>(
            RBAC_KEY,
            targets,
        );

        if (!requiredRoles) {
            return true;
        }

        const auth = context.switchToHttp().getRequest<Request>().auth;

        if (!auth) {
            throw new UnauthorizedException();
        }

        // 匿名（role なし）は profiles を持たないので読まない。行が無ければ JWT の値のまま
        let role = auth.role;
        if (auth.userId && role) {
            role = (await this.currentRoles.findRole(auth.userId)) ?? role;
        }
        if (role === Role.VIEWER) {
            throw new ForbiddenException();
        }

        const flagKey = this.reflector.getAllAndOverride<string | undefined>(
            RBAC_WHEN_FLAG_KEY,
            targets,
        );
        if (flagKey && !(await this.featureFlags.isEnabled(flagKey))) {
            return true;
        }

        if (!role || !requiredRoles.includes(role)) {
            throw new ForbiddenException();
        }

        return true;
    }
}
