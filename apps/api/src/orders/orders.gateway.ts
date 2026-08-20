import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UserRole } from '@prisma/client';
import { JwtPayload } from '@ximchistka/shared';
import { PrismaService } from '../prisma/prisma.service';
import type { AdminRevenueNotification } from './admin-notify.service';

/** Tashkilotning barcha buyurtmalarini ko'radigan xodimlar xonasi */
export const orgRoom = (organizationId: string) => `org:${organizationId}`;
/** Faqat shu filialga biriktirilgan xodimlar xonasi */
export const branchRoom = (branchId: string) => `branch:${branchId}`;
/** Tushum bildirishnomalari — faqat super admin */
export const orgRevenueRoom = (organizationId: string) => `org-revenue:${organizationId}`;

@WebSocketGateway({ cors: { origin: '*' } })
export class OrdersGateway implements OnGatewayConnection {
  private readonly logger = new Logger(OrdersGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private jwt: JwtService,
    private config: ConfigService,
    private prisma: PrismaService,
  ) {}

  /**
   * Har bir ulanish JWT bilan tasdiqlanadi va faqat o'z tashkiloti xonalariga
   * qo'shiladi — boshqa firmaning buyurtmalari hech qachon yuborilmaydi.
   */
  async handleConnection(client: Socket) {
    const token = this.extractToken(client);
    if (!token) {
      this.reject(client, 'Token yo\'q');
      return;
    }

    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(token, {
        secret: this.config.get<string>('JWT_SECRET') ?? 'dev-jwt-secret',
      });
    } catch {
      this.reject(client, 'Token yaroqsiz yoki muddati tugagan');
      return;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        isActive: true,
        role: true,
        organizationId: true,
        organization: { select: { isActive: true } },
        userBranches: { select: { branchId: true } },
      },
    });

    if (!user?.isActive || !user.organization?.isActive || !user.organizationId) {
      this.reject(client, 'Foydalanuvchi yoki tashkilot faol emas');
      return;
    }
    if (user.role === UserRole.customer || user.role === UserRole.platform_admin) {
      this.reject(client, 'Realtime kanal faqat firma xodimlari uchun');
      return;
    }

    const organizationId = user.organizationId;
    const branchIds = user.userBranches.map((b) => b.branchId);

    // Qamrov orderScopeForUser bilan bir xil bo'lishi kerak
    if (user.role === UserRole.super_admin || branchIds.length === 0) {
      await client.join(orgRoom(organizationId));
    } else {
      await Promise.all(branchIds.map((branchId) => client.join(branchRoom(branchId))));
    }

    if (user.role === UserRole.super_admin) {
      await client.join(orgRevenueRoom(organizationId));
    }
  }

  emitOrderUpdate(organizationId: string, branchId: string, order: unknown) {
    const payload = {
      branchId,
      order,
      at: new Date().toISOString(),
    };
    this.server
      .to(orgRoom(organizationId))
      .to(branchRoom(branchId))
      .emit('order:updated', payload);
  }

  emitAdminRevenueNotification(
    organizationId: string,
    notification: AdminRevenueNotification,
  ) {
    this.server.to(orgRevenueRoom(organizationId)).emit('admin:revenue', notification);
  }

  private extractToken(client: Socket): string | null {
    const fromAuth = client.handshake.auth?.token;
    if (typeof fromAuth === 'string' && fromAuth) return fromAuth;

    const header = client.handshake.headers?.authorization;
    if (typeof header === 'string' && header.toLowerCase().startsWith('bearer ')) {
      return header.slice(7).trim() || null;
    }

    const fromQuery = client.handshake.query?.token;
    if (typeof fromQuery === 'string' && fromQuery) return fromQuery;

    return null;
  }

  private reject(client: Socket, reason: string) {
    this.logger.debug(`Socket rad etildi (${client.id}): ${reason}`);
    client.emit('auth:error', { message: reason });
    client.disconnect(true);
  }
}
