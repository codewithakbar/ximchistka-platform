import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DeliveryType,
  OrderStatus,
  UserRole,
} from '@prisma/client';
import { ORDER_STATUS_LABELS, VALID_STATUS_TRANSITIONS } from '@ximchistka/shared';
import { PrismaService } from '../prisma/prisma.service';
import { BranchesService } from '../branches/branches.service';
import { NotificationsService } from '../notifications/notifications.service';
import { OrdersGateway } from './orders.gateway';
import { AdminNotifyService } from './admin-notify.service';

interface OrderItemInput {
  serviceId: string;
  itemType?: string;
  quantity: number;
  notes?: string;
  photoUrl?: string;
}

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private branches: BranchesService,
    private notifications: NotificationsService,
    private gateway: OrdersGateway,
    private adminNotify: AdminNotifyService,
  ) {}

  async list(
    user: {
      id: string;
      role: UserRole;
      organizationId?: string;
      branchIds: string[];
      customerProfileId?: string;
    },
    query: { branchId?: string; status?: OrderStatus; page?: number; limit?: number },
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Record<string, unknown> = {};

    if (user.role === UserRole.customer) {
      if (!user.customerProfileId) return { data: [], total: 0, page, limit };
      where.customerId = user.customerProfileId;
    } else {
      Object.assign(where, this.branches.orderScopeForUser(user));
    }

    if (query.branchId) {
      await this.branches.assertBranchAccess(user, query.branchId);
      where.branchId = query.branchId;
    }
    if (query.status) where.status = query.status;

    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          branch: true,
          customer: { include: { user: true } },
          items: { include: { service: true } },
          pickupDelivery: true,
          statusHistory: { orderBy: { createdAt: 'desc' }, take: 5 },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(
    id: string,
    user: {
      role: UserRole;
      organizationId?: string;
      branchIds: string[];
      customerProfileId?: string;
    },
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        branch: true,
        customer: { include: { user: true, addresses: true } },
        items: { include: { service: true } },
        pickupDelivery: { include: { courier: true } },
        statusHistory: { include: { user: true }, orderBy: { createdAt: 'asc' } },
        payments: true,
      },
    });
    if (!order) throw new NotFoundException('Buyurtma topilmadi');
    await this.assertAccess(user, order.branchId, order.customerId);
    return order;
  }

  async create(
    user: { id: string; role: UserRole; customerProfileId?: string },
    data: {
      branchId: string;
      items: OrderItemInput[];
      notes?: string;
      deliveryType: DeliveryType;
      scheduledAt?: string;
      address?: string;
      promoCode?: string;
    },
  ) {
    if (user.role !== UserRole.customer) {
      throw new BadRequestException('Faqat mijoz buyurtma yaratishi mumkin');
    }
    let customerId = user.customerProfileId;
    if (!customerId) {
      const profile = await this.prisma.customerProfile.findUnique({ where: { userId: user.id } });
      customerId = profile?.id;
    }
    if (!customerId) throw new BadRequestException('Mijoz profili topilmadi');

    return this.createOrderForCustomer(customerId, user.id, data);
  }

  async createStaffOrder(
    user: { id: string; role: UserRole; organizationId?: string; branchIds: string[] },
    data: {
      branchId: string;
      customerPhone: string;
      customerName: string;
      items: OrderItemInput[];
      notes?: string;
      deliveryType: DeliveryType;
      scheduledAt?: string;
      address?: string;
    },
  ) {
    await this.branches.assertBranchAccess(user, data.branchId);

    const customerPhone = this.normalizePhone(data.customerPhone);
    let customerUser = await this.prisma.user.findUnique({ where: { phone: customerPhone } });
    if (!customerUser) {
      customerUser = await this.prisma.user.create({
        data: {
          phone: customerPhone,
          fullName: data.customerName,
          role: UserRole.customer,
          customerProfile: { create: {} },
        },
        include: { customerProfile: true },
      });
    }

    const profile = await this.prisma.customerProfile.findUnique({
      where: { userId: customerUser.id },
    });
    if (!profile) throw new BadRequestException('Mijoz profili yaratilmadi');

    return this.createOrderForCustomer(profile.id, user.id, data);
  }

  private async createOrderForCustomer(
    customerId: string,
    changedBy: string,
    data: {
      branchId: string;
      items: OrderItemInput[];
      notes?: string;
      deliveryType: DeliveryType;
      scheduledAt?: string;
      address?: string;
      promoCode?: string;
    },
  ) {
    const prices = await this.prisma.priceRule.findMany({
      where: { branchId: data.branchId },
    });
    const priceMap = new Map(prices.map((p) => [`${p.serviceId}:${p.itemType}`, p.price]));

    let totalAmount = 0;
    const itemsData = data.items.map((item) => {
      const itemType = item.itemType ?? 'standart';
      const unitPrice = priceMap.get(`${item.serviceId}:${itemType}`);
      if (!unitPrice) throw new BadRequestException(`Narx topilmadi: ${item.serviceId}`);
      totalAmount += unitPrice * item.quantity;
      return { ...item, itemType, unitPrice };
    });

    const orderNumber = await this.generateOrderNumber();

    const order = await this.prisma.order.create({
      data: {
        orderNumber,
        branchId: data.branchId,
        customerId,
        status: OrderStatus.submitted,
        totalAmount,
        notes: data.notes,
        estimatedReady: new Date(Date.now() + 48 * 3600000),
        items: { create: itemsData },
        statusHistory: { create: { status: OrderStatus.submitted, changedBy } },
        pickupDelivery: {
          create: {
            type: data.deliveryType,
            scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
            address: data.address,
          },
        },
      },
      include: {
        branch: true,
        items: { include: { service: true } },
        customer: { include: { user: true } },
      },
    });

    this.gateway.emitOrderUpdate(order.branchId, order);
    if (order.totalAmount > 0) {
      this.adminNotify.orderCreated(order);
    }
    return order;
  }

  async updateStatus(
    id: string,
    status: OrderStatus,
    user: { id: string; role: UserRole; organizationId?: string; branchIds: string[] },
    note?: string,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { customer: { include: { user: true } }, branch: true },
    });
    if (!order) throw new NotFoundException('Buyurtma topilmadi');
    await this.branches.assertBranchAccess(user, order.branchId);

    const allowed = VALID_STATUS_TRANSITIONS[order.status as keyof typeof VALID_STATUS_TRANSITIONS];
    if (!allowed?.includes(status)) {
      throw new BadRequestException(`${order.status} dan ${status} ga o'tish mumkin emas`);
    }

    const updated = await this.prisma.order.update({
      where: { id },
      data: {
        status,
        statusHistory: { create: { status, changedBy: user.id, note } },
      },
      include: {
        branch: true,
        customer: { include: { user: true } },
        items: { include: { service: true } },
      },
    });

    const label = ORDER_STATUS_LABELS[status as keyof typeof ORDER_STATUS_LABELS];
    await this.notifications.notifyOrderStatus(
      updated.customer.user.phone,
      updated.orderNumber,
      label,
    );

    this.gateway.emitOrderUpdate(updated.branchId, updated);
    if (updated.totalAmount > 0) {
      this.adminNotify.orderStatusChanged(updated);
    }
    return updated;
  }

  async trackByNumber(orderNumber: string) {
    const order = await this.prisma.order.findUnique({
      where: { orderNumber },
      include: {
        branch: true,
        statusHistory: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!order) throw new NotFoundException('Buyurtma topilmadi');
    return order;
  }

  private async assertAccess(
    user: {
      role: UserRole;
      organizationId?: string;
      branchIds: string[];
      customerProfileId?: string;
    },
    branchId: string,
    customerId: string,
  ) {
    if (user.role === UserRole.customer) {
      if (user.customerProfileId !== customerId) {
        throw new ForbiddenException('Ruxsat yo\'q');
      }
      return;
    }
    await this.branches.assertBranchAccess(user, branchId);
  }

  private async generateOrderNumber() {
    const count = await this.prisma.order.count();
    return `XC-${String(10001 + count).padStart(5, '0')}`;
  }

  private normalizePhone(phone: string) {
    const digits = phone.replace(/\D/g, '');
    if (digits.startsWith('998')) return `+${digits}`;
    if (digits.length === 9) return `+998${digits}`;
    return phone.startsWith('+') ? phone : `+${digits}`;
  }
}
