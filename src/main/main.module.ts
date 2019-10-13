import { Module } from '@nestjs/common';
import { ApiV1Module } from './v1/apiv1.module';
import { WebsocketModule } from './websocket/websocket.module';

@Module({
  imports: [ApiV1Module, WebsocketModule],
})
export class MainModule {}
