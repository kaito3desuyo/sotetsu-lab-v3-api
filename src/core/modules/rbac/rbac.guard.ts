import {
    ExecutionContext,
    ForbiddenException,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { RBAC_KEY } from './rbac.decorator';
import { Role } from './role.enum';

/** @RBAC の付いた口だけ役割を見る。トークンが無ければ 401、役割が足りなければ 403 */
@Injectable()
export class RBACGuard {
    constructor(private reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean {
        const requiredRoles = this.reflector.getAllAndOverride<Role[]>(
            RBAC_KEY,
            [context.getHandler(), context.getClass()],
        );

        if (!requiredRoles) {
            return true;
        }

        const auth = context.switchToHttp().getRequest<Request>().auth;

        if (!auth) {
            throw new UnauthorizedException();
        }

        if (!auth.role || !requiredRoles.includes(auth.role)) {
            throw new ForbiddenException();
        }

        return true;
    }
}
