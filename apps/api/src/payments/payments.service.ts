import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { createHash, timingSafeEqual } from 'crypto';
import { OrderStatus, PaymentProvider, PaymentStatus, Prisma, UserRole } from '@prisma/client';
import { VALID_STATUS_TRANSITIONS } from '@ximchistka/shared';
import { PrismaService } from '../prisma/prisma.service';
import { BranchesService } from '../branches/branches.service';
import { AdminNotifyService } from '../orders/admin-notify.service';
import { OrdersService } from '../orders/orders.service';

export type PaymentPart = { provider: PaymentProvider; amount: number };

export type PaymentActor = {
  id: string;
  role: UserRole;
  organizationId?: string;
  branchIds: string[];
  customerProfileId?: string;
};

const SIGNED_PROVIDERS = new Set<string>([PaymentProvider.click, PaymentProvider.payme]);

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private prisma: PrismaService,
    private branches: BranchesService,
    private adminNotify: AdminNotifyService,
    private orders: OrdersService,
  ) {}

  /** Buyurtma bo'yicha to'lov holati: jami, to'langan, qoldiq */
  async summaryForOrder(orderId: string, actor: PaymentActor) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payments: { orderBy: { createdAt: 'desc' } } },
    });
    if (!order) throw new NotFoundException('Buyurtma topilmadi');
    await this.assertOrderAccess(actor, order);

    return this.buildSummary(order, order.payments);
  }

  /**
   * Xodim kassada qabul qilgan to'lovni yozib qo'yadi. Bir buyurtma bir necha
   * usulda to'lanishi mumkin (masalan, bir qismi naqd, bir qismi Click) —
   * qismlar bitta tranzaksiyada saqlanadi. Qisman to'lov ham mumkin.
   */
  async record(
    orderId: string,
    data: { parts: PaymentPart[]; note?: string },
    actor: PaymentActor,
  ) {
    if (actor.role === UserRole.customer) {
      throw new ForbiddenException('To\'lovni faqat xodim qayd etadi');
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payments: true, branch: true },
    });
    if (!order) throw new NotFoundException('Buyurtma topilmadi');
    await this.assertOrderAccess(actor, order);

    if (order.status === OrderStatus.cancelled) {
      throw new BadRequestException('Bekor qilingan buyurtmaga to\'lov qabul qilinmaydi');
    }

    if (!data.parts?.length) {
      throw new BadRequestException('Kamida bitta to\'lov qismi kiriting');
    }
    if (data.parts.length > 5) {
      throw new BadRequestException('Bitta to\'lovda 5 tagacha usul bo\'lishi mumkin');
    }

    const parts = data.parts.map((part) => {
      const amount = Math.floor(Number(part.amount));
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new BadRequestException('Har bir qism 0 dan katta bo\'lishi kerak');
      }
      return { provider: part.provider, amount };
    });
    const totalPartAmount = parts.reduce((sum, part) => sum + part.amount, 0);

    const outstanding = this.outstandingOf(order.totalAmount, order.payments);
    if (outstanding <= 0) {
      throw new BadRequestException('Bu buyurtma to\'liq to\'langan');
    }
    if (totalPartAmount > outstanding) {
      throw new BadRequestException(
        `To'lov qoldiqdan oshmasligi kerak (qoldiq: ${outstanding})`,
      );
    }

    const note = data.note?.trim() ? data.note.trim().slice(0, 300) : undefined;
    const stamp = Date.now();
    const created = await this.prisma.$transaction(
      parts.map((part, i) =>
        this.prisma.payment.create({
          data: {
            orderId,
            provider: part.provider,
            amount: part.amount,
            status: PaymentStatus.paid,
            externalId: `${part.provider}-${stamp}-${i}`,
            metadata: {
              recordedBy: actor.id,
              ...(note ? { note } : {}),
            } as Prisma.InputJsonValue,
          },
        }),
      ),
    );

    this.adminNotify.paymentReceived({
      amount: totalPartAmount,
      order: { ...order, branch: order.branch },
    });

    const payments = await this.prisma.payment.findMany({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
    });
    return { payments: created, summary: this.buildSummary(order, payments) };
  }

  /**
   * Buyurtmani topshirish: agar qoldiq bo'lsa avval to'lovni qayd etadi,
   * so'ng buyurtmani yakunlaydi (completed). To'langan bo'lsa faqat yakunlaydi.
   */
  async handover(
    orderId: string,
    parts: PaymentPart[] | undefined,
    actor: PaymentActor,
  ) {
    if (actor.role === UserRole.customer) {
      throw new ForbiddenException('Buyurtmani xodim topshiradi');
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payments: true, branch: true },
    });
    if (!order) throw new NotFoundException('Buyurtma topilmadi');
    await this.assertOrderAccess(actor, order);

    const allowed =
      VALID_STATUS_TRANSITIONS[order.status as keyof typeof VALID_STATUS_TRANSITIONS] ?? [];
    if (!allowed.includes(OrderStatus.completed)) {
      throw new BadRequestException('Bu buyurtmani hozir topshirib bo\'lmaydi');
    }

    // Qoldiq to'lovini qabul qilamiz (bo'lsa)
    if (parts?.length) {
      await this.record(orderId, { parts }, actor);
    }

    // Buyurtmani yakunlaymiz — updateStatus barcha tekshiruv, bildirishnoma
    // va WebSocket yangilanishlarini bajaradi
    const updated = await this.orders.updateStatus(
      orderId,
      OrderStatus.completed,
      actor,
    );

    const payments = await this.prisma.payment.findMany({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
    });
    return { order: updated, summary: this.buildSummary(order, payments) };
  }

  /** Xato qayd etilgan to'lovni qaytarish (refunded) — qoldiq qayta ochiladi */
  async refund(paymentId: string, actor: PaymentActor) {
    if (
      actor.role !== UserRole.super_admin &&
      actor.role !== UserRole.branch_manager
    ) {
      throw new ForbiddenException('To\'lovni faqat rahbar qaytara oladi');
    }

    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { order: { include: { payments: true } } },
    });
    if (!payment) throw new NotFoundException('To\'lov topilmadi');
    await this.assertOrderAccess(actor, payment.order);

    if (payment.status !== PaymentStatus.paid) {
      throw new BadRequestException('Faqat to\'langan to\'lovni qaytarish mumkin');
    }

    await this.prisma.payment.update({
      where: { id: paymentId },
      data: { status: PaymentStatus.refunded },
    });

    const payments = await this.prisma.payment.findMany({
      where: { orderId: payment.orderId },
      orderBy: { createdAt: 'desc' },
    });
    return this.buildSummary(payment.order, payments);
  }

  private paidTotal(payments: { status: PaymentStatus; amount: number }[]) {
    return payments
      .filter((p) => p.status === PaymentStatus.paid)
      .reduce((s, p) => s + p.amount, 0);
  }

  private outstandingOf(
    total: number,
    payments: { status: PaymentStatus; amount: number }[],
  ) {
    return Math.max(0, total - this.paidTotal(payments));
  }

  private buildSummary(
    order: { id: string; totalAmount: number },
    payments: {
      id: string;
      provider: PaymentProvider;
      status: PaymentStatus;
      amount: number;
      createdAt: Date;
    }[],
  ) {
    const paid = this.paidTotal(payments);
    return {
      orderId: order.id,
      totalAmount: order.totalAmount,
      paidAmount: paid,
      outstanding: Math.max(0, order.totalAmount - paid),
      fullyPaid: paid >= order.totalAmount && order.totalAmount > 0,
      payments: payments.map((p) => ({
        id: p.id,
        provider: p.provider,
        status: p.status,
        amount: p.amount,
        createdAt: p.createdAt.toISOString(),
      })),
    };
  }

  async initiate(orderId: string, provider: PaymentProvider, actor: PaymentActor) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payments: true },
    });
    if (!order) throw new NotFoundException('Buyurtma topilmadi');

    await this.assertOrderAccess(actor, order);

    const outstanding = this.outstandingOf(order.totalAmount, order.payments);
    if (outstanding <= 0) {
      throw new BadRequestException('Bu buyurtma to\'liq to\'langan');
    }

    const payment = await this.prisma.payment.create({
      data: {
        orderId,
        provider,
        amount: outstanding,
        status: PaymentStatus.pending,
        externalId: `${provider}-${Date.now()}`,
      },
    });

    if (provider === PaymentProvider.click) {
      return { payment, redirectUrl: this.buildClickUrl(payment.id, outstanding) };
    }
    if (provider === PaymentProvider.payme) {
      return { payment, redirectUrl: this.buildPaymeUrl(payment.id, outstanding) };
    }
    if (provider === PaymentProvider.cash) {
      // Naqd to'lovni faqat xodim tasdiqlay oladi — mijoz o'zi "to'landi" deb belgilay olmaydi
      if (actor.role === UserRole.customer) {
        throw new ForbiddenException('Naqd to\'lovni xodim tasdiqlaydi');
      }
      return this.confirm(payment.id);
    }

    throw new BadRequestException('To\'lov provayderi qo\'llab-quvvatlanmaydi');
  }

  async confirm(paymentId: string) {
    const existing = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!existing) throw new NotFoundException('To\'lov topilmadi');
    if (existing.status === PaymentStatus.paid) return existing;

    const payment = await this.prisma.payment.update({
      where: { id: paymentId },
      data: { status: PaymentStatus.paid },
      include: {
        order: { include: { branch: true } },
      },
    });
    this.adminNotify.paymentReceived({
      amount: payment.amount,
      order: payment.order,
    });
    return payment;
  }

  /**
   * Provayder webhook'i. Imzo tekshirilmasa hech qanday to'lov "to'langan"
   * holatiga o'tmaydi — aks holda paymentId ni bilgan har kim buyurtmani
   * bepul to'langan qilib qo'ya olardi.
   */
  async webhook(
    provider: string,
    payload: Record<string, unknown>,
    headers: Record<string, unknown> = {},
  ) {
    if (!SIGNED_PROVIDERS.has(provider)) {
      throw new BadRequestException('Noma\'lum to\'lov provayderi');
    }

    const paymentId = String(payload.paymentId ?? payload.merchant_trans_id ?? '');
    if (!paymentId) throw new BadRequestException('paymentId yo\'q');

    this.assertWebhookAuthentic(provider, paymentId, payload, headers);

    const existing = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!existing) throw new NotFoundException('To\'lov topilmadi');
    if (existing.provider !== provider) {
      throw new BadRequestException('To\'lov provayderi mos emas');
    }
    if (existing.status === PaymentStatus.paid) return existing;

    this.assertWebhookAmount(provider, payload, existing.amount);

    const payment = await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.paid,
        metadata: payload as Prisma.InputJsonValue,
      },
      include: {
        order: { include: { branch: true } },
      },
    });
    this.adminNotify.paymentReceived({
      amount: payment.amount,
      order: payment.order,
    });
    return payment;
  }

  private async assertOrderAccess(
    actor: PaymentActor,
    order: { branchId: string; customerId: string },
  ) {
    if (actor.role === UserRole.customer) {
      if (!actor.customerProfileId || actor.customerProfileId !== order.customerId) {
        throw new ForbiddenException('Bu buyurtmaga ruxsat yo\'q');
      }
      return;
    }
    await this.branches.assertBranchAccess(actor, order.branchId);
  }

  private assertWebhookAuthentic(
    provider: string,
    paymentId: string,
    payload: Record<string, unknown>,
    headers: Record<string, unknown>,
  ) {
    const secret =
      provider === PaymentProvider.click
        ? process.env.CLICK_SECRET_KEY
        : process.env.PAYME_SECRET_KEY;

    if (!secret) {
      if (process.env.PAYMENT_WEBHOOK_ALLOW_UNSIGNED === 'true') {
        this.logger.warn(
          `${provider} webhook imzosiz qabul qilindi (PAYMENT_WEBHOOK_ALLOW_UNSIGNED=true) — faqat dev uchun`,
        );
        return;
      }
      throw new ForbiddenException(
        `${provider.toUpperCase()}_SECRET_KEY sozlanmagan — webhook rad etildi`,
      );
    }

    if (provider === PaymentProvider.click) {
      this.assertClickSignature(paymentId, payload, secret);
      return;
    }
    this.assertPaymeAuth(headers, secret);
  }

  /** Click Shop API: md5(click_trans_id + service_id + SECRET + merchant_trans_id + amount + action + sign_time) */
  private assertClickSignature(
    paymentId: string,
    payload: Record<string, unknown>,
    secret: string,
  ) {
    const provided = String(payload.sign_string ?? '').toLowerCase();
    if (!provided) throw new ForbiddenException('sign_string yo\'q');

    const raw = [
      String(payload.click_trans_id ?? ''),
      String(payload.service_id ?? ''),
      secret,
      paymentId,
      String(payload.amount ?? ''),
      String(payload.action ?? ''),
      String(payload.sign_time ?? ''),
    ].join('');
    const expected = createHash('md5').update(raw).digest('hex');

    if (!this.safeEqual(provided, expected)) {
      throw new ForbiddenException('Click imzosi noto\'g\'ri');
    }
  }

  /** Payme: Authorization: Basic base64("Paycom:" + SECRET) */
  private assertPaymeAuth(headers: Record<string, unknown>, secret: string) {
    const header = headers['authorization'] ?? headers['Authorization'];
    if (typeof header !== 'string' || !header.toLowerCase().startsWith('basic ')) {
      throw new ForbiddenException('Payme avtorizatsiyasi yo\'q');
    }
    const decoded = Buffer.from(header.slice(6).trim(), 'base64').toString('utf8');
    if (!this.safeEqual(decoded, `Paycom:${secret}`)) {
      throw new ForbiddenException('Payme avtorizatsiyasi noto\'g\'ri');
    }
  }

  /** Provayder yuborgan summa saqlangan to'lov summasiga mos bo'lishi shart */
  private assertWebhookAmount(
    provider: string,
    payload: Record<string, unknown>,
    expectedSum: number,
  ) {
    const raw = payload.amount;
    if (raw === undefined || raw === null || raw === '') return;

    const value = Number(raw);
    if (!Number.isFinite(value)) {
      throw new BadRequestException('Summa formati noto\'g\'ri');
    }

    // Payme tiyinda, Click so'mda ishlaydi
    const asSum = provider === PaymentProvider.payme ? value / 100 : value;
    if (Math.round(asSum) !== expectedSum) {
      throw new BadRequestException('To\'lov summasi buyurtma summasiga mos emas');
    }
  }

  private safeEqual(a: string, b: string) {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) return false;
    return timingSafeEqual(bufA, bufB);
  }

  private buildClickUrl(paymentId: string, amount: number) {
    const merchantId = process.env.CLICK_MERCHANT_ID ?? 'demo';
    const serviceId = process.env.CLICK_SERVICE_ID ?? 'demo';
    return `https://my.click.uz/services/pay?merchant_id=${merchantId}&service_id=${serviceId}&amount=${amount}&transaction_param=${paymentId}`;
  }

  private buildPaymeUrl(paymentId: string, amount: number) {
    const merchantId = process.env.PAYME_MERCHANT_ID ?? 'demo';
    const amountTiyin = amount * 100;
    const encoded = Buffer.from(
      `m=${merchantId};ac.order_id=${paymentId};a=${amountTiyin}`,
    ).toString('base64');
    return `https://checkout.paycom.uz/${encoded}`;
  }
}
