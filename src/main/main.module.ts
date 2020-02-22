import { Module } from '@nestjs/common';
import { ApiV1Module } from './v1/apiv1.module';
// import { WebsocketModule } from './websocket/websocket.module';
import { ApiV2Module } from './v2/apiv2.module';

@Module({
    imports: [
        ApiV1Module,
        ApiV2Module,
        // WebsocketModule
    ],
})
export class MainModule {}
