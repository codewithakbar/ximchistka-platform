import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { createHash, timingSafeEqual } from 'crypto';
import { PaymentProvider, PaymentStatus, Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BranchesService } from '../branches/branches.service';
import { AdminNotifyService } from '../orders/admin-notify.service';

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
  ) {}

  async initiate(orderId: string, provider: PaymentProvider, actor: PaymentActor) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payments: true },
    });
    if (!order) throw new NotFoundException('Buyurtma topilmadi');

    await this.assertOrderAccess(actor, order);

    const paid = order.payments
      .filter((p) => p.status === PaymentStatus.paid)
      .reduce((s, p) => s + p.amount, 0);
    const outstanding = order.totalAmount - paid;
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
