import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { LocationService } from './location.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class LocationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly locationService: LocationService) {}

  handleConnection(client: Socket, ...args: any[]) {
    console.log(`Client connected: ${client.id}`);
    const driverId = client.handshake.query.driverId as string;
    if (driverId) {
      client.join(`driver_${driverId}`); 
      console.log(`Client ${client.id} joined room driver_${driverId}`);
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('updateLocation')
  async handleUpdateLocation(
    @MessageBody() data: { driverId: number; latitude: number; longitude: number },
    @ConnectedSocket() client: Socket,
  ) {
    await this.locationService.updateLiveLocation(data.driverId, data.latitude, data.longitude);
    this.server.to(`driver_${data.driverId}`).emit('locationUpdated', data);
    return { status: 'ok' };
  }
}