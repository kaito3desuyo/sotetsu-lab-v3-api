import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { RBAC_KEY } from './rbac.decorator';
import { Role } from './role.enum';

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

        const payload = context
            .switchToHttp()
            .getRequest<Request>().cognito_jwt_payload;

        return requiredRoles.some((role) => payload.scope === role);
    }
}
