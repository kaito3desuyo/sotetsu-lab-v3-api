import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsResponse,
} from '@nestjs/websockets';
import { Server, Client } from 'socket.io';
import { Observable, of, from } from 'rxjs';
import { map } from 'rxjs/operators';

@WebSocketGateway({ namespace: '/operation/real-time' })
export class OperationRealTimeGateway {
  @WebSocketServer()
  server: Server;

  @SubscribeMessage('sendSighting')
  sightingReload(client: Client, data: any): Observable<WsResponse<any>> {
    const event = 'sightingReload';
    const response = data;
    return of(response).pipe(map(() => ({ event, data })));
  }
}
