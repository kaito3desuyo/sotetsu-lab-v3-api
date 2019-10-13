import { Module } from '@nestjs/common';
import { OperationRealTimeGateway } from './operation.gateway';

@Module({
  providers: [OperationRealTimeGateway],
})
export class WebsocketModule {}
