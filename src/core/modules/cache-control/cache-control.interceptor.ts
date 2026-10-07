import {
    CallHandler,
    ExecutionContext,
    Injectable,
    NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Response } from 'express';
import onHeaders from 'on-headers';
import { Observable } from 'rxjs';
import { CACHE_CONTROL_METADATA_KEY } from './cache-control.decorator';

/**
 * `@CacheControl` の値を、成功した返答（2xx）にだけ書く。
 * 付けるかどうかはヘッダーを送り出す直前に状態コードで決める。handler が値を返した後に
 * JSON にする段階で落ちた 500 にも付けないため。
 */
@Injectable()
export class CacheControlInterceptor implements NestInterceptor {
    constructor(private readonly reflector: Reflector) {}

    intercept(
        context: ExecutionContext,
        next: CallHandler,
    ): Observable<unknown> {
        const value = this.reflector.get<string | undefined>(
            CACHE_CONTROL_METADATA_KEY,
            context.getHandler(),
        );

        if (value) {
            const res = context.switchToHttp().getResponse<Response>();
            onHeaders(res, () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    res.setHeader('Cache-Control', value);
                }
            });
        }

        return next.handle();
    }
}
