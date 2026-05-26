import { Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TenantUser } from '../branches/tenant-scope';

@Injectable()
export class CourierService {
  constructor(private prisma: PrismaService) {}

  listTasks(courierId: string) {
    return this.prisma.pickupDelivery.findMany({
      where: {
        courierId,
        order: { status: { in: [OrderStatus.ready, OrderStatus.out_for_delivery] } },
      },
      include: {
        order: {
          include: {
            branch: true,
            customer: { include: { user: true } },
          },
        },
      },
      orderBy: { scheduledAt: 'asc' },
    });
  }

  async listUnassigned(user: TenantUser) {
    let branchIds = user.branchIds ?? [];
    if (user.organizationId && (!branchIds.length || user.role === UserRole.super_admin)) {
      const branches = await this.prisma.branch.findMany({
        where: { organizationId: user.organizationId, isActive: true },
        select: { id: true },
      });
      branchIds = branches.map((b) => b.id);
    }

    return this.prisma.pickupDelivery.findMany({
      where: {
        courierId: null,
        order: {
          branchId: { in: branchIds.length ? branchIds : ['__none__'] },
          status: OrderStatus.ready,
        },
      },
      include: {
        order: {
          include: {
            branch: true,
            customer: { include: { user: true } },
          },
        },
      },
    });
  }

  async assign(deliveryId: string, courierId: string) {
    const delivery = await this.prisma.pickupDelivery.findUnique({
      where: { id: deliveryId },
      include: { order: true },
    });
    if (!delivery) throw new NotFoundException('Yetkazish topilmadi');

    await this.prisma.pickupDelivery.update({
      where: { id: deliveryId },
      data: { courierId },
    });

    return this.prisma.order.update({
      where: { id: delivery.orderId },
      data: { status: OrderStatus.out_for_delivery },
    });
  }

  async complete(deliveryId: string, courierId: string) {
    const delivery = await this.prisma.pickupDelivery.findUnique({
      where: { id: deliveryId },
    });
    if (!delivery || delivery.courierId !== courierId) {
      throw new NotFoundException('Vazifa topilmadi');
    }

    await this.prisma.pickupDelivery.update({
      where: { id: deliveryId },
      data: { completedAt: new Date() },
    });

    return this.prisma.order.update({
      where: { id: delivery.orderId },
      data: { status: OrderStatus.completed },
    });
  }
}
