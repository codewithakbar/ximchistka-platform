import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EskizClient } from './eskiz.client';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private prisma: PrismaService,
    private eskiz: EskizClient,
  ) {}

  async sendSms(phone: string, message: string) {
    const provider = process.env.SMS_PROVIDER ?? 'mock';

    let sent = true;
    let error: string | undefined;

    if (provider === 'eskiz') {
      const result = await this.eskiz.send(phone, message);
      sent = result.sent;
      error = result.error;
    } else {
      this.logger.log(`[SMS mock] ${phone}: ${message}`);
    }

    // Log har doim yoziladi — yuborilmagan SMS ni ham keyin tekshirish mumkin
    await this.prisma.smsLog.create({
      data: {
        phone,
        message,
        provider,
        status: sent ? 'sent' : `failed:${error ?? 'unknown'}`.slice(0, 60),
      },
    });

    return { sent };
  }

  async notifyOrderStatus(phone: string, orderNumber: string, statusLabel: string) {
    return this.sendSms(
      phone,
      `Buyurtma ${orderNumber}: ${statusLabel}. CleanWay`,
    );
  }

  async sendTelegram(message: string) {
    // Eski bot — faqat platforma adminiga xabar (trial signup va hokazo)
    const tokens = [
      process.env.TELEGRAM_ADMIN_BOT_TOKEN,
      process.env.TELEGRAM_BOT_TOKEN_2,
    ]
      .map((t) => (t ?? '').trim())
      .filter(Boolean);
    const unique = [...new Set(tokens)];
    const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
    if (!unique.length || !chatId) {
      this.logger.warn(
        'Admin Telegram sozlanmagan (TELEGRAM_ADMIN_BOT_TOKEN / TELEGRAM_ADMIN_CHAT_ID)',
      );
      return { sent: false };
    }

    let anySent = false;
    for (const token of unique) {
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
          continue;
        }
        anySent = true;
      } catch (err) {
        this.logger.error('Telegram yuborishda xatolik', err);
      }
    }
    return { sent: anySent };
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
