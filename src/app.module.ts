import { Module, OnApplicationBootstrap } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Server } from 'http';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MainModule } from './main/main.module';
import { DatabaseModule } from './core/modules/database/database.module';

@Module({
    imports: [DatabaseModule, MainModule],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule implements OnApplicationBootstrap {
    constructor(private readonly refHost: HttpAdapterHost<any>) {}

    onApplicationBootstrap(): void {
        const server: Server = this.refHost.httpAdapter.getHttpServer();
        server.keepAliveTimeout = 61 * 1000;
        server.headersTimeout = 65 * 1000;

        console.log(server.keepAliveTimeout);
    }
}
