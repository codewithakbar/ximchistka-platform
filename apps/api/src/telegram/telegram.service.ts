import { Injectable, Logger } from '@nestjs/common';
import { OrderStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { customerStatusNotification, escapeHtml, fmtPrice } from './telegram-format';

const API_BASE = 'https://api.telegram.org';

export type TgInlineButton = { text: string; callback_data: string };
export type TgReplyKeyboard = {
  keyboard: ({ text: string; request_contact?: boolean } | string)[][];
  resize_keyboard?: boolean;
  one_time_keyboard?: boolean;
};

export type SendOptions = {
  replyMarkup?:
    | { inline_keyboard: TgInlineButton[][] }
    | TgReplyKeyboard
    | { remove_keyboard: true };
};

/**
 * Telegram Bot API bilan past darajadagi ishlash: xabar yuborish/tahrirlash
 * va bog'langan hisoblarga bildirishnoma tarqatish. Bot suhbat mantiqi
 * alohida — telegram-bot.service.ts da.
 */
@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);
  private botUsername: string | null = null;

  constructor(private prisma: PrismaService) {}

  get token(): string | null {
    return process.env.TELEGRAM_BOT_TOKEN || null;
  }

  isConfigured() {
    return Boolean(this.token);
  }

  /** Bot API metodini chaqirish. Xato bo'lsa null qaytaradi (log bilan). */
  async call<T = unknown>(
    method: string,
    payload: Record<string, unknown>,
    opts: { timeoutMs?: number; silent?: boolean } = {},
  ): Promise<T | null> {
    if (!this.token) return null;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 15_000);
    try {
      const res = await fetch(`${API_BASE}/bot${this.token}/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      const body = (await res.json()) as { ok: boolean; result?: T; description?: string };
      if (!body.ok) {
        if (!opts.silent) {
          this.logger.warn(`Telegram ${method} xato: ${body.description ?? res.status}`);
        }
        return null;
      }
      return body.result ?? null;
    } catch (err) {
      if (!opts.silent) {
        this.logger.warn(`Telegram ${method} bajarilmadi: ${String(err)}`);
      }
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  async sendMessage(chatId: string, html: string, opts: SendOptions = {}) {
    return this.call<{ message_id: number }>('sendMessage', {
      chat_id: chatId,
      text: html,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      ...(opts.replyMarkup ? { reply_markup: opts.replyMarkup } : {}),
    });
  }

  async editMessage(chatId: string, messageId: number, html: string, opts: SendOptions = {}) {
    return this.call('editMessageText', {
      chat_id: chatId,
      message_id: messageId,
      text: html,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      ...(opts.replyMarkup ? { reply_markup: opts.replyMarkup } : {}),
    });
  }

  async answerCallback(callbackId: string, text?: string) {
    return this.call('answerCallbackQuery', {
      callback_query_id: callbackId,
      ...(text ? { text } : {}),
    });
  }

  /** Bot username (login sahifasida ko'rsatish uchun, keshlangan) */
  async getBotUsername(): Promise<string | null> {
    if (!this.isConfigured()) return null;
    if (this.botUsername) return this.botUsername;
    const me = await this.call<{ username?: string }>('getMe', {});
    this.botUsername = me?.username ?? null;
    return this.botUsername;
  }

  /* ---------------------------------------------------------------- */
  /* Bog'langan hisoblar                                               */
  /* ---------------------------------------------------------------- */

  findAccountByTelegramId(telegramId: string) {
    return this.prisma.telegramAccount.findUnique({
      where: { telegramId },
      include: {
        user: {
          include: { userBranches: true, customerProfile: true, organization: true },
        },
      },
    });
  }

  findAccountByUserId(userId: string) {
    return this.prisma.telegramAccount.findUnique({ where: { userId } });
  }

  /** Telefon tasdiqlangach hisobni foydalanuvchiga bog'laydi */
  async linkAccount(data: {
    telegramId: string;
    chatId: string;
    userId: string;
    username?: string;
    firstName?: string;
  }) {
    // Bitta foydalanuvchiga bitta Telegram: eski bog'lanish bo'lsa bo'shatamiz
    await this.prisma.telegramAccount.updateMany({
      where: { userId: data.userId, telegramId: { not: data.telegramId } },
      data: { userId: null },
    });
    return this.prisma.telegramAccount.upsert({
      where: { telegramId: data.telegramId },
      update: {
        chatId: data.chatId,
        userId: data.userId,
        username: data.username,
        firstName: data.firstName,
        botState: null,
      },
      create: {
        telegramId: data.telegramId,
        chatId: data.chatId,
        userId: data.userId,
        username: data.username,
        firstName: data.firstName,
      },
    });
  }

  async upsertAnonymous(data: {
    telegramId: string;
    chatId: string;
    username?: string;
    firstName?: string;
  }) {
    return this.prisma.telegramAccount.upsert({
      where: { telegramId: data.telegramId },
      update: { chatId: data.chatId, username: data.username, firstName: data.firstName },
      create: { ...data },
    });
  }

  setState(telegramId: string, botState: string | null) {
    return this.prisma.telegramAccount.update({
      where: { telegramId },
      data: { botState },
    });
  }

  /** CRM ga kirish uchun 6 xonali bir martalik kod (5 daqiqa amal qiladi) */
  async createLoginCode(userId: string): Promise<string> {
    const row = await this.createLoginCodeRow(userId);
    return row.code;
  }

  /** Kod yozuvi (id bilan — yuborilmasa o'chirish uchun) */
  async createLoginCodeRow(userId: string) {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    return this.prisma.telegramLoginCode.create({
      data: {
        userId,
        code,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      },
      select: { id: true, code: true },
    });
  }

  async deleteLoginCode(id: string) {
    await this.prisma.telegramLoginCode.delete({ where: { id } }).catch(() => {});
  }

  /** Oxirgi kod so'ralgan vaqt (spam oldini olish uchun) */
  async lastLoginCodeAt(userId: string): Promise<Date | null> {
    const last = await this.prisma.telegramLoginCode.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });
    return last?.createdAt ?? null;
  }

  /* ---------------------------------------------------------------- */
  /* Bildirishnomalar                                                  */
  /* ---------------------------------------------------------------- */

  /** Mijozga buyurtma holati o'zgargani haqida xabar (bog'langan bo'lsa) */
  async notifyCustomerOrderStatus(order: {
    orderNumber: string;
    status: OrderStatus;
    branch: { name: string };
    customer: { user: { id: string } };
  }) {
    try {
      const account = await this.findAccountByUserId(order.customer.user.id);
      if (!account) return;
      await this.sendMessage(
        account.chatId,
        customerStatusNotification({
          orderNumber: order.orderNumber,
          status: order.status,
          branchName: order.branch.name,
        }),
      );
    } catch (err) {
      this.logger.warn(`Mijoz TG bildirishnomasi yuborilmadi: ${String(err)}`);
    }
  }

  /** Tashkilot egalariga (super_admin, bog'langan, yoqilgan) xabar */
  async notifyOrgAdmins(organizationId: string, html: string) {
    try {
      const accounts = await this.prisma.telegramAccount.findMany({
        where: {
          notifyEnabled: true,
          user: {
            organizationId,
            role: UserRole.super_admin,
            isActive: true,
          },
        },
        select: { chatId: true },
      });
      await Promise.all(accounts.map((a) => this.sendMessage(a.chatId, html)));
    } catch (err) {
      this.logger.warn(`Egalarga TG bildirishnomasi yuborilmadi: ${String(err)}`);
    }
  }

  /** Egalar uchun tushum voqeasi formati */
  adminEventHtml(event: {
    title: string;
    message: string;
    amount: number;
    orderNumber: string;
  }): string {
    return (
      `<b>${escapeHtml(event.title)}</b>\n` +
      `${escapeHtml(event.message)}\n` +
      `💵 ${fmtPrice(event.amount)}`
    );
  }
}
