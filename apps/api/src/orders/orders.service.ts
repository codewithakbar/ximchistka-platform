import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DeliveryType,
  OrderStatus,
  PaymentStatus,
  Prisma,
  UserRole,
} from '@prisma/client';
import {
  applyServiceDiscount,
  ORDER_STATUS_LABELS,
  VALID_STATUS_TRANSITIONS,
} from '@ximchistka/shared';
import { PrismaService } from '../prisma/prisma.service';
import { BranchesService } from '../branches/branches.service';
import { NotificationsService } from '../notifications/notifications.service';
import { OrdersGateway } from './orders.gateway';
import { AdminNotifyService } from './admin-notify.service';
import { PromoService } from '../promo/promo.service';
import { TelegramService } from '../telegram/telegram.service';

/** Tahrirlash tarixda shu izoh bilan qoladi */
const ORDER_EDITED_NOTE = 'Buyurtma tahrirlandi';

/** Bitta sahifada qaytariladigan eng ko'p buyurtma */
const MAX_ORDER_PAGE_SIZE = 100;

interface OrderItemInput {
  serviceId: string;
  itemType?: string;
  quantity: number;
  notes?: string;
  color?: string;
  photoUrl?: string;
  /** Xodim kiritgan narx (konstruktor xizmat yoki kelishilgan chegirma) */
  unitPrice?: number;
}

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private branches: BranchesService,
    private notifications: NotificationsService,
    private gateway: OrdersGateway,
    private adminNotify: AdminNotifyService,
    private promo: PromoService,
    private telegram: TelegramService,
  ) {}

  async list(
    user: {
      id: string;
      role: UserRole;
      organizationId?: string;
      branchIds: string[];
      customerProfileId?: string;
    },
    query: {
      branchId?: string;
      status?: OrderStatus;
      q?: string;
      page?: number;
      limit?: number;
    },
  ) {
    // Cheklanmagan limit butun jadvalni bitta so'rovda tortib olishga imkon berardi
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(Math.max(1, query.limit ?? 20), MAX_ORDER_PAGE_SIZE);
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

    const q = query.q?.trim();
    if (q) {
      // Chek raqami, mijoz ismi yoki telefoni bo'yicha qidiruv
      const digits = q.replace(/\D/g, '');
      where.OR = [
        { orderNumber: { contains: q, mode: 'insensitive' } },
        { customer: { user: { fullName: { contains: q, mode: 'insensitive' } } } },
        ...(digits.length >= 4
          ? [{ customer: { user: { phone: { contains: digits } } } }]
          : []),
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          branch: true,
          customer: { include: { user: true } },
          items: { include: { service: true } },
          pickupDelivery: true,
          payments: { select: { status: true, amount: true } },
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

    // Mijoz o'zi narx belgilay olmaydi
    return this.createOrderForCustomer(customerId, user.id, data, {
      allowPriceOverride: false,
    });
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
      promoCode?: string;
    },
  ) {
    await this.branches.assertBranchAccess(user, data.branchId);

    const customerPhone = this.normalizePhone(data.customerPhone);
    let customerUser = await this.prisma.user.findUnique({
      where: { phone: customerPhone },
      include: { customerProfile: true },
    });

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
    } else if (customerUser.role !== UserRole.customer) {
      throw new BadRequestException(
        'Bu telefon boshqa xodim akkauntiga bog\'langan — boshqa raqam kiriting',
      );
    } else {
      if (!customerUser.customerProfile) {
        await this.prisma.customerProfile.create({
          data: { userId: customerUser.id },
        });
        customerUser = await this.prisma.user.findUniqueOrThrow({
          where: { id: customerUser.id },
          include: { customerProfile: true },
        });
      }
      if (
        data.customerName.trim() &&
        customerUser.fullName !== data.customerName.trim()
      ) {
        customerUser = await this.prisma.user.update({
          where: { id: customerUser.id },
          data: { fullName: data.customerName.trim() },
          include: { customerProfile: true },
        });
      }
    }

    const profile = customerUser.customerProfile;
    if (!profile) throw new BadRequestException('Mijoz profili yaratilmadi');

    return this.createOrderForCustomer(profile.id, user.id, data, {
      allowPriceOverride: true,
    });
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
    opts: { allowPriceOverride: boolean },
  ) {
    const branch = await this.prisma.branch.findUnique({
      where: { id: data.branchId },
      select: { organizationId: true },
    });
    if (!branch) throw new BadRequestException('Filial topilmadi');

    const priced = await this.priceItems(data.branchId, data.items, opts);
    const promo = data.promoCode?.trim()
      ? await this.promo.resolveForOrder(
          data.promoCode,
          branch.organizationId,
          priced.totalAmount,
        )
      : null;

    const totalAmount = Math.max(0, priced.totalAmount - (promo?.discountAmount ?? 0));
    const discountAmount = Math.max(0, priced.subtotal - totalAmount);
    const itemsData = priced.itemsData;

    // Bir xil prefiksli filiallar bir vaqtda bir xil raqamni hisoblashi mumkin —
    // unique to'qnashuvda (P2002) yangi raqam olib qayta urinamiz
    const createWithNumber = (orderNumber: string) =>
      this.prisma.order.create({
        data: {
          orderNumber,
          branchId: data.branchId,
          customerId,
          status: OrderStatus.submitted,
          totalAmount,
          discountAmount,
          promoCode: promo?.code,
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

    let order: Awaited<ReturnType<typeof createWithNumber>> | null = null;
    for (let attempt = 0; attempt < 3 && !order; attempt++) {
      const orderNumber = await this.generateOrderNumber(data.branchId);
      try {
        order = await createWithNumber(orderNumber);
      } catch (err) {
        if (!this.isOrderNumberConflict(err) || attempt === 2) throw err;
      }
    }
    if (!order) {
      throw new BadRequestException('Chek raqami yaratilmadi — qayta urinib ko\'ring');
    }

    if (promo) {
      void this.promo.markUsed(promo.id);
    }

    this.gateway.emitOrderUpdate(order.branch.organizationId, order.branchId, order);
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
    void this.telegram.notifyCustomerOrderStatus(updated);

    this.gateway.emitOrderUpdate(updated.branch.organizationId, updated.branchId, updated);
    if (updated.totalAmount > 0) {
      this.adminNotify.orderStatusChanged(updated);
    }
    return updated;
  }

  async trackByNumber(orderNumber: string) {
    // Endpoint ommaviy — faqat kuzatuvga kerakli maydonlar qaytadi
    // (summa, eslatma, mijoz ma'lumotlari tashqariga chiqmaydi)
    const order = await this.prisma.order.findUnique({
      where: { orderNumber },
      select: {
        orderNumber: true,
        status: true,
        createdAt: true,
        estimatedReady: true,
        branch: { select: { name: true, address: true, phone: true } },
        statusHistory: {
          select: { status: true, createdAt: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!order) throw new NotFoundException('Buyurtma topilmadi');
    return order;
  }

  /**
   * Buyurtmani tahrirlash: xizmatlar ro'yxati to'liq almashtiriladi va summa
   * qayta hisoblanadi. Yakunlangan/bekor qilingan buyurtma tahrirlanmaydi.
   */
  async updateOrder(
    id: string,
    user: { id: string; role: UserRole; organizationId?: string; branchIds: string[] },
    data: {
      items?: OrderItemInput[];
      notes?: string | null;
      deliveryType?: DeliveryType;
      address?: string | null;
      scheduledAt?: string | null;
    },
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { branch: true, payments: true, pickupDelivery: true },
    });
    if (!order) throw new NotFoundException('Buyurtma topilmadi');
    await this.branches.assertBranchAccess(user, order.branchId);

    if (
      order.status === OrderStatus.completed ||
      order.status === OrderStatus.cancelled
    ) {
      throw new BadRequestException(
        'Yakunlangan yoki bekor qilingan buyurtmani tahrirlab bo\'lmaydi',
      );
    }

    let itemsData: Awaited<ReturnType<typeof this.priceItems>>['itemsData'] | null = null;
    let totalAmount = order.totalAmount;
    let discountAmount = order.discountAmount;

    if (data.items) {
      const priced = await this.priceItems(order.branchId, data.items, {
        allowPriceOverride: true,
      });

      // Buyurtmadagi promo-kod qayta qo'llanadi — kod limiti keyin tugagan
      // bo'lsa ham buyurtma o'z chegirmasini yo'qotmaydi
      let promoDiscount = 0;
      if (order.promoCode) {
        const promo = await this.promo.resolveForExistingOrder(
          order.promoCode,
          order.branch.organizationId,
          priced.totalAmount,
        );
        promoDiscount = promo.discountAmount;
      }

      totalAmount = Math.max(0, priced.totalAmount - promoDiscount);
      discountAmount = Math.max(0, priced.subtotal - totalAmount);

      const paid = order.payments
        .filter((p) => p.status === PaymentStatus.paid)
        .reduce((sum, p) => sum + p.amount, 0);
      if (totalAmount < paid) {
        throw new BadRequestException(
          `Yangi summa to'langan summadan (${paid}) kam bo'lishi mumkin emas — avval to'lovni qaytaring`,
        );
      }

      itemsData = priced.itemsData;
    }

    const touchesDelivery =
      data.deliveryType !== undefined ||
      data.address !== undefined ||
      data.scheduledAt !== undefined;

    const updated = await this.prisma.$transaction(async (tx) => {
      if (itemsData) {
        await tx.orderItem.deleteMany({ where: { orderId: id } });
        await tx.orderItem.createMany({
          data: itemsData.map((item) => ({
            orderId: id,
            serviceId: item.serviceId,
            itemType: item.itemType,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            notes: item.notes,
            color: item.color,
            photoUrl: item.photoUrl,
          })),
        });
      }

      if (order.pickupDelivery && touchesDelivery) {
        await tx.pickupDelivery.update({
          where: { orderId: id },
          data: {
            ...(data.deliveryType !== undefined ? { type: data.deliveryType } : {}),
            ...(data.address !== undefined ? { address: data.address || null } : {}),
            ...(data.scheduledAt !== undefined
              ? { scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null }
              : {}),
          },
        });
      }

      return tx.order.update({
        where: { id },
        data: {
          ...(itemsData ? { totalAmount, discountAmount } : {}),
          ...(data.notes !== undefined ? { notes: data.notes || null } : {}),
          statusHistory: {
            create: {
              status: order.status,
              changedBy: user.id,
              note: ORDER_EDITED_NOTE,
            },
          },
        },
        include: {
          branch: true,
          customer: { include: { user: true } },
          items: { include: { service: true } },
          pickupDelivery: true,
        },
      });
    });

    this.gateway.emitOrderUpdate(
      updated.branch.organizationId,
      updated.branchId,
      updated,
    );
    return updated;
  }

  /** Filial narxlari + xizmat chegirmasi bo'yicha satrlarni hisoblaydi */
  private async priceItems(
    branchId: string,
    items: OrderItemInput[],
    opts: { allowPriceOverride: boolean } = { allowPriceOverride: false },
  ) {
    if (!items.length) {
      throw new BadRequestException('Kamida bitta xizmat tanlang');
    }

    const prices = await this.prisma.priceRule.findMany({
      where: { branchId },
      include: { service: true },
    });
    const priceMap = new Map(
      prices.map((p) => [
        `${p.serviceId}:${p.itemType}`,
        { listPrice: p.price, service: p.service },
      ]),
    );

    const serviceIds = [...new Set(items.map((i) => i.serviceId))];
    const services = await this.prisma.service.findMany({
      where: { id: { in: serviceIds } },
    });
    const serviceMap = new Map(services.map((s) => [s.id, s]));

    let subtotal = 0;
    let totalAmount = 0;
    const itemsData = items.map((item) => {
      const quantity = Math.floor(Number(item.quantity));
      if (!Number.isFinite(quantity) || quantity < 1) {
        throw new BadRequestException('Xizmat miqdori kamida 1 bo\'lishi kerak');
      }

      const itemType = item.itemType ?? 'standart';
      const entry = priceMap.get(`${item.serviceId}:${itemType}`);
      const service = entry?.service ?? serviceMap.get(item.serviceId);
      if (!service) {
        throw new BadRequestException(`Xizmat topilmadi: ${item.serviceId}`);
      }

      const listPrice = entry?.listPrice ?? service.basePrice;

      // Xodim kelishilgan narxni kiritishi mumkin (kichik chegirma yoki
      // konstruktor xizmat). Mijoz so'rovida ustunlik e'tiborga olinmaydi.
      let unitPrice: number;
      const override = opts.allowPriceOverride ? item.unitPrice : undefined;
      if (override !== undefined && override !== null) {
        const value = Math.floor(Number(override));
        if (!Number.isFinite(value) || value < 0) {
          throw new BadRequestException(
            `${service.name}: narx 0 dan kichik bo'lmasligi kerak`,
          );
        }
        unitPrice = value;
      } else if (service.isCustom) {
        throw new BadRequestException(
          `${service.name} — konstruktor xizmat: narxini kiriting`,
        );
      } else {
        unitPrice = applyServiceDiscount(listPrice, service);
      }

      // Konstruktor xizmatda ro'yxat narxi sifatida kiritilgan narx olinadi,
      // aks holda "chegirma" deb noto'g'ri ko'rsatilardi
      const effectiveList = service.isCustom ? unitPrice : listPrice;
      subtotal += Math.max(effectiveList, unitPrice) * quantity;
      totalAmount += unitPrice * quantity;
      const color = item.color?.trim().slice(0, 40) || undefined;
      const { unitPrice: _ignored, ...rest } = item;
      return { ...rest, quantity, itemType, unitPrice, color };
    });

    return { itemsData, subtotal, totalAmount };
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

  private normalizeOrderPrefix(prefix: string) {
    const cleaned = prefix
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 8);
    return cleaned || 'XC';
  }

  private formatOrderNumber(prefix: string, sequence: number) {
    const pad = Math.max(4, String(sequence).length);
    return `${this.normalizeOrderPrefix(prefix)}-${String(sequence).padStart(pad, '0')}`;
  }

  /** Chek raqami bo'yicha unique to'qnashuvmi? */
  private isOrderNumberConflict(err: unknown) {
    return (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2002' &&
      String(err.meta?.target ?? '').includes('orderNumber')
    );
  }

  /**
   * Chek raqami har bir filial uchun alohida yuritiladi (atomik hisoblagich).
   * Filial prefiksi bo'lmasa tashkilot prefiksi ishlatiladi; raqam band bo'lsa
   * hisoblagich bo'sh raqam topilguncha suriladi.
   */
  private async generateOrderNumber(branchId: string) {
    return this.prisma.$transaction(async (tx) => {
      // Davomiylik: filial hali chek chiqarmagan va o'z prefiksi yo'q bo'lsa,
      // eski (tashkilot darajasidagi) hisoblagichdan davom etadi — aks holda
      // mavjud buyurtma raqamlari bilan to'qnashib qolar edi.
      const current = await tx.branch.findUniqueOrThrow({
        where: { id: branchId },
        select: {
          orderNumberNext: true,
          orderNumberPrefix: true,
          organization: { select: { orderNumberNext: true } },
        },
      });
      if (
        current.orderNumberNext === 1 &&
        current.orderNumberPrefix === null &&
        current.organization.orderNumberNext > 1
      ) {
        await tx.branch.update({
          where: { id: branchId },
          data: { orderNumberNext: current.organization.orderNumberNext },
        });
      }

      for (let attempt = 0; attempt < 30; attempt++) {
        const branch = await tx.branch.update({
          where: { id: branchId },
          data: { orderNumberNext: { increment: 1 } },
          select: {
            orderNumberPrefix: true,
            orderNumberNext: true,
            organization: { select: { orderNumberPrefix: true } },
          },
        });
        const prefix =
          branch.orderNumberPrefix ?? branch.organization.orderNumberPrefix;
        const sequence = branch.orderNumberNext - 1;
        const orderNumber = this.formatOrderNumber(prefix, sequence);
        const exists = await tx.order.findUnique({
          where: { orderNumber },
          select: { id: true },
        });
        if (!exists) return orderNumber;
      }
      throw new BadRequestException('Chek raqami yaratilmadi — sozlamalarni tekshiring');
    });
  }

  private normalizePhone(phone: string) {
    const digits = phone.replace(/\D/g, '');
    if (digits.startsWith('998')) return `+${digits}`;
    if (digits.length === 9) return `+998${digits}`;
    return phone.startsWith('+') ? phone : `+${digits}`;
  }
}
