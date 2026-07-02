import { Module, OnApplicationBootstrap } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { AppController } from './app.controller';
import { AuthModule } from './core/modules/auth/auth.module';
import { DatabaseModule } from './core/modules/database/database.module';
import { LoggerModule } from './core/modules/logger/logger.module';
import { RBACModule } from './core/modules/rbac/rbac.module';
import { ApiRoutingModule } from './routes/api-routing.module';

@Module({
    imports: [
        AuthModule,
        RBACModule,
        DatabaseModule,
        LoggerModule,
        ApiRoutingModule,
    ],
    controllers: [AppController],
})
export class AppModule implements OnApplicationBootstrap {
    constructor(private readonly refHost: HttpAdapterHost<any>) {}

    onApplicationBootstrap(): void {
        const _server = this.refHost.httpAdapter.getHttpServer();
        // _server.keepAliveTimeout = 61 * 1000;
        // _server.headersTimeout = 65 * 1000;
    }
}
