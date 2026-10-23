import {
    ExecutionContext,
    ForbiddenException,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { FeatureFlags } from '../feature-flag/feature-flags.js';
import { RBAC_KEY } from './rbac.decorator.js';
import { RBAC_WHEN_FLAG_KEY } from './rbac-when-flag.decorator.js';
import { Role } from './role.enum.js';

/**
 * @RBAC の付いた口だけ役割を見る。トークンが無ければ 401、役割が足りなければ 403。
 * @RBACWhenFlag の付いた口は、そのフラグが off なら役割を見ずに通す。
 */
@Injectable()
export class RBACGuard {
    constructor(
        private reflector: Reflector,
        private featureFlags: FeatureFlags,
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

        const flagKey = this.reflector.getAllAndOverride<string | undefined>(
            RBAC_WHEN_FLAG_KEY,
            targets,
        );
        if (flagKey && !(await this.featureFlags.isEnabled(flagKey))) {
            return true;
        }

        if (!auth.role || !requiredRoles.includes(auth.role)) {
            throw new ForbiddenException();
        }

        return true;
    }
}
