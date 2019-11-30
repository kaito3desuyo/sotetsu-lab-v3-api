import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsResponse,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Client, Socket } from 'socket.io';

@WebSocketGateway()
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
  async emitSendSightingEvent(socket: Socket, data: any): Promise<void> {
    const event = 'sendSighting';
    socket.broadcast.emit(event, data);
  }
}
