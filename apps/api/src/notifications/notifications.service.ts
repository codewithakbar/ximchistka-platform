import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async sendSms(phone: string, message: string) {
    const provider = process.env.SMS_PROVIDER ?? 'mock';
    if (provider === 'mock') {
      console.log(`[SMS mock] ${phone}: ${message}`);
    } else if (provider === 'eskiz') {
      // Eskiz API integration placeholder
      console.log(`[SMS eskiz] ${phone}: ${message}`);
    }
    await this.prisma.smsLog.create({
      data: { phone, message, provider, status: 'sent' },
    });
    return { sent: true };
  }

  async notifyOrderStatus(phone: string, orderNumber: string, statusLabel: string) {
    return this.sendSms(
      phone,
      `Buyurtma ${orderNumber}: ${statusLabel}. Ximchistka`,
    );
  }
}
