import {
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import type { AdminRevenueNotification } from './admin-notify.service';

@WebSocketGateway({ cors: { origin: '*' } })
export class OrdersGateway {
  @WebSocketServer()
  server!: Server;

  emitOrderUpdate(branchId: string, order: unknown) {
    const payload = {
      branchId,
      order,
      at: new Date().toISOString(),
    };
    this.server.emit('order:updated', payload);
    this.server.to(`branch:${branchId}`).emit('order:updated', payload);
  }

  emitAdminRevenueNotification(notification: AdminRevenueNotification) {
    this.server.emit('admin:revenue', notification);
  }
}
