import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

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
      `Buyurtma ${orderNumber}: ${statusLabel}. CleanWay`,
    );
  }

  async sendTelegram(message: string) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
    if (!token || !chatId) {
      this.logger.warn('Telegram sozlanmagan (TELEGRAM_BOT_TOKEN / TELEGRAM_ADMIN_CHAT_ID)');
      return { sent: false };
    }

    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        }),
      });
      if (!res.ok) {
        const err = await res.text();
        this.logger.error(`Telegram xatolik: ${err}`);
        return { sent: false };
      }
      return { sent: true };
    } catch (err) {
      this.logger.error('Telegram yuborishda xatolik', err);
      return { sent: false };
    }
  }

  async notifyTrialSignup(data: {
    organizationName: string;
    slug: string;
    branchName: string;
    branchAddress: string;
    branchPhone: string;
    adminFullName: string;
    adminPhone: string;
    contactEmail?: string | null;
    demoDays: number;
    crmUrl: string;
  }) {
    const lines = [
      '<b>🆕 Yangi demo ro\'yxatdan o\'tish</b>',
      '',
      `<b>Firma:</b> ${this.escapeHtml(data.organizationName)}`,
      `<b>Slug:</b> <code>${this.escapeHtml(data.slug)}</code>`,
      `<b>Filial:</b> ${this.escapeHtml(data.branchName)}`,
      `<b>Manzil:</b> ${this.escapeHtml(data.branchAddress)}`,
      `<b>Filial tel:</b> ${this.escapeHtml(data.branchPhone)}`,
      '',
      `<b>Admin:</b> ${this.escapeHtml(data.adminFullName)}`,
      `<b>Telefon:</b> <code>${this.escapeHtml(data.adminPhone)}</code>`,
    ];
    if (data.contactEmail) {
      lines.push(`<b>Email:</b> ${this.escapeHtml(data.contactEmail)}`);
    }
    lines.push(
      '',
      `<b>Demo:</b> ${data.demoDays} kun`,
      `<b>CRM:</b> ${this.escapeHtml(data.crmUrl)}/login`,
    );
    return this.sendTelegram(lines.join('\n'));
  }

  private escapeHtml(value: string) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}
