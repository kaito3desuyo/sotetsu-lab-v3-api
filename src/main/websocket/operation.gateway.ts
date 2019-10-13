import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsResponse,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Client, Socket } from 'socket.io';

@WebSocketGateway({ namespace: '/operation/real-time' })
export class OperationRealTimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Client) {
    // tslint:disable-next-line: no-console
    console.log('client connected');
  }

  handleDisconnect(client: Client) {
    // tslint:disable-next-line: no-console
    console.log('client disconnected');
  }

  @SubscribeMessage('sendSighting')
  emitSendSightingEvent(
    socket: Socket,
    data: any,
  ): WsResponse<{ eventType: 'send' | 'receive'; data: any }> {
    const event = 'sightingReload';
    socket.broadcast.emit(event, { eventType: 'receive', data });
    return {
      event,
      data: { eventType: 'send', data },
    };
  }
}
