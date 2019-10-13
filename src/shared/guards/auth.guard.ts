import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService) {}
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    if (process.env.NODE_ENV === 'development') {
      return true;
    }
    const request = context.switchToHttp().getRequest();

    if (!request.headers.authorization || !request.headers['x-app-client-id']) {
      return false;
    }

    const valid = this.authService.checkToken(
      request.headers.authorization,
      request.headers['x-app-client-id'],
    );
    return valid;
  }
}
