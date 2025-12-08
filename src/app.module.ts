import { Module, OnApplicationBootstrap } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Server } from 'http';
import { AppController } from './app.controller';
import { AppService } from './app.service';
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
    providers: [AppService],
})
export class AppModule implements OnApplicationBootstrap {
    constructor(private readonly refHost: HttpAdapterHost<any>) {}

    onApplicationBootstrap(): void {
        const server: Server = this.refHost.httpAdapter.getHttpServer();
        // server.keepAliveTimeout = 61 * 1000;
        // server.headersTimeout = 65 * 1000;

        // console.log(server.keepAliveTimeout, server.headersTimeout);
    }
}
