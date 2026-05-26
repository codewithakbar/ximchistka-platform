import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PaymentProvider, PaymentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AdminNotifyService } from '../orders/admin-notify.service';

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    private adminNotify: AdminNotifyService,
  ) {}

  async initiate(orderId: string, provider: PaymentProvider) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Buyurtma topilmadi');

    const payment = await this.prisma.payment.create({
      data: {
        orderId,
        provider,
        amount: order.totalAmount,
        status: PaymentStatus.pending,
        externalId: `${provider}-${Date.now()}`,
      },
    });

    if (provider === PaymentProvider.click) {
      return {
        payment,
        redirectUrl: this.buildClickUrl(payment.id, order.totalAmount),
      };
    }
    if (provider === PaymentProvider.payme) {
      return {
        payment,
        redirectUrl: this.buildPaymeUrl(payment.id, order.totalAmount),
      };
    }
    if (provider === PaymentProvider.cash) {
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

  async webhook(provider: string, payload: Record<string, unknown>) {
    const paymentId = String(payload.paymentId ?? payload.merchant_trans_id ?? '');
    if (!paymentId) throw new BadRequestException('paymentId yo\'q');

    const existing = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!existing) throw new NotFoundException('To\'lov topilmadi');
    if (existing.status === PaymentStatus.paid) return existing;

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
