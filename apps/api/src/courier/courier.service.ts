import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DeliveryType, OrderStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TenantUser } from '../branches/tenant-scope';
import { OrdersGateway } from '../orders/orders.gateway';

/** Kuryer xizmatini talab qiladigan yetkazish turlari (do'konda qabul kuryer talab qilmaydi). */
const COURIER_DELIVERY_TYPES: DeliveryType[] = [DeliveryType.pickup, DeliveryType.delivery];

@Injectable()
export class CourierService {
  constructor(
    private prisma: PrismaService,
    private gateway: OrdersGateway,
  ) {}

  /** Kuryerning o'ziga tayinlangan, hali tugallanmagan vazifalari. */
  listTasks(courierId: string) {
    return this.prisma.pickupDelivery.findMany({
      where: {
        courierId,
        completedAt: null,
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

  /** Kuryer yakunlagan (yetkazilgan) vazifalar tarixi. */
  listCompleted(courierId: string) {
    return this.prisma.pickupDelivery.findMany({
      where: {
        courierId,
        completedAt: { not: null },
      },
      include: {
        order: {
          include: {
            branch: true,
            customer: { include: { user: true } },
          },
        },
      },
      orderBy: { completedAt: 'desc' },
      take: 50,
    });
  }

  private async resolveBranchIds(user: TenantUser) {
    let branchIds = user.branchIds ?? [];
    if (user.organizationId && (!branchIds.length || user.role === UserRole.super_admin)) {
      const branches = await this.prisma.branch.findMany({
        where: { organizationId: user.organizationId, isActive: true },
        select: { id: true },
      });
      branchIds = branches.map((b) => b.id);
    }
    return branchIds;
  }

  /** Kuryer tayinlanmagan, tayyor buyurtmalar. */
  async listUnassigned(user: TenantUser) {
    const branchIds = await this.resolveBranchIds(user);

    return this.prisma.pickupDelivery.findMany({
      where: {
        courierId: null,
        type: { in: COURIER_DELIVERY_TYPES },
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
      orderBy: { scheduledAt: 'asc' },
    });
  }

  /** Yo'lda bo'lgan (kuryerga tayinlangan) yetkazishlar. */
  async listActive(user: TenantUser) {
    const branchIds = await this.resolveBranchIds(user);

    return this.prisma.pickupDelivery.findMany({
      where: {
        courierId: { not: null },
        completedAt: null,
        type: { in: COURIER_DELIVERY_TYPES },
        order: {
          branchId: { in: branchIds.length ? branchIds : ['__none__'] },
          status: OrderStatus.out_for_delivery,
        },
      },
      include: {
        courier: { select: { id: true, fullName: true, phone: true, avatarUrl: true } },
        order: {
          include: {
            branch: true,
            customer: { include: { user: true } },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /** Filiallar bo'yicha yetkazilgan (yakunlangan) buyurtmalar tarixi. */
  async listCompletedForBranches(user: TenantUser) {
    const branchIds = await this.resolveBranchIds(user);

    return this.prisma.pickupDelivery.findMany({
      where: {
        completedAt: { not: null },
        type: { in: COURIER_DELIVERY_TYPES },
        order: { branchId: { in: branchIds.length ? branchIds : ['__none__'] } },
      },
      include: {
        courier: { select: { id: true, fullName: true, phone: true, avatarUrl: true } },
        order: {
          include: {
            branch: true,
            customer: { include: { user: true } },
          },
        },
      },
      orderBy: { completedAt: 'desc' },
      take: 50,
    });
  }

  /** Tayinlash uchun mavjud (faol) kuryerlar ro'yxati. */
  async listCouriers(user: TenantUser) {
    if (!user.organizationId) return [];
    return this.prisma.user.findMany({
      where: {
        organizationId: user.organizationId,
        role: UserRole.courier,
        isActive: true,
      },
      select: { id: true, fullName: true, phone: true, avatarUrl: true },
      orderBy: { fullName: 'asc' },
    });
  }

  async assign(deliveryId: string, courierId: string, user: TenantUser) {
    const delivery = await this.prisma.pickupDelivery.findUnique({
      where: { id: deliveryId },
      include: { order: true },
    });
    if (!delivery) throw new NotFoundException('Yetkazish topilmadi');

    const courier = await this.prisma.user.findFirst({
      where: {
        id: courierId,
        role: UserRole.courier,
        isActive: true,
        ...(user.organizationId ? { organizationId: user.organizationId } : {}),
      },
    });
    if (!courier) throw new BadRequestException('Kuryer topilmadi');

    await this.prisma.pickupDelivery.update({
      where: { id: deliveryId },
      data: { courierId },
    });

    const order = await this.prisma.order.update({
      where: { id: delivery.orderId },
      data: {
        status: OrderStatus.out_for_delivery,
        statusHistory: {
          create: { status: OrderStatus.out_for_delivery, changedBy: courierId },
        },
      },
      include: {
        branch: true,
        customer: { include: { user: true } },
        items: { include: { service: true } },
      },
    });

    this.gateway.emitOrderUpdate(order.branch.organizationId, order.branchId, order);
    return order;
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

    const order = await this.prisma.order.update({
      where: { id: delivery.orderId },
      data: {
        status: OrderStatus.completed,
        statusHistory: {
          create: { status: OrderStatus.completed, changedBy: courierId },
        },
      },
      include: {
        branch: true,
        customer: { include: { user: true } },
        items: { include: { service: true } },
      },
    });

    this.gateway.emitOrderUpdate(order.branch.organizationId, order.branchId, order);
    return order;
  }
}
