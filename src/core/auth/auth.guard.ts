import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AuthService } from './auth.service';

@Injectable()
export class AuthGuard implements CanActivate {
    constructor(private authService: AuthService) {}

    canActivate(context: ExecutionContext): boolean {
        const req = context.switchToHttp().getRequest();

        const valid = this.authService.checkToken(
            req.headers.authorization,
            req.headers['x-app-client-id'],
        );

        return valid;
    }
}
