import { Module, OnApplicationBootstrap } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { AppController } from './app.controller.js';
import { AccessTraceModule } from './core/modules/access-trace/access-trace.module.js';
import { AuthModule } from './core/modules/auth/auth.module.js';
import { CacheControlModule } from './core/modules/cache-control/cache-control.module.js';
import { DatabaseModule } from './core/modules/database/database.module.js';
import { FeatureFlagModule } from './core/modules/feature-flag/feature-flag.module.js';
import { LoggerModule } from './core/modules/logger/logger.module.js';
import { CurrentRoleModule } from './core/modules/rbac/current-role.module.js';
import { RBACModule } from './core/modules/rbac/rbac.module.js';
import { ApiRoutingModule } from './routes/api-routing.module.js';

@Module({
    imports: [
        AccessTraceModule,
        AuthModule,
        RBACModule,
        CurrentRoleModule,
        CacheControlModule,
        DatabaseModule,
        FeatureFlagModule,
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
