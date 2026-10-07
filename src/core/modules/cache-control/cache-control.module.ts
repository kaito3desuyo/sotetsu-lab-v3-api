import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { CacheControlInterceptor } from './cache-control.interceptor';
import { noStoreOnError } from './no-store-on-error.middleware';

/**
 * 読み込むと、成功した返答には `@CacheControl` の値を、エラーの返答には `no-store` を付ける。
 */
@Module({
    providers: [
        { provide: APP_INTERCEPTOR, useClass: CacheControlInterceptor },
    ],
})
export class CacheControlModule implements NestModule {
    configure(consumer: MiddlewareConsumer): void {
        consumer.apply(noStoreOnError).forRoutes('*');
    }
}
