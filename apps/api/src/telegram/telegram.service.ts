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
  /** Aniq bot tokeni; berilmasa faol kontekst yoki birinchi token */
  token?: string;
};

type CallOpts = {
  timeoutMs?: number;
  silent?: boolean;
  token?: string;
};

/**
 * Telegram Bot API bilan past darajadagi ishlash: xabar yuborish/tahrirlash
 * va bog'langan hisoblarga bildirishnoma tarqatish. Bot suhbat mantiqi
 * alohida — telegram-bot.service.ts da.
 *
 * Bir nechta bot tokeni qo'llab-quvvatlanadi (TELEGRAM_BOT_TOKEN, TELEGRAM_BOT_TOKEN_2).
 */
@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);
  private botUsername: string | null = null;
  /** Polling/handler ichida joriy bot tokeni */
  private activeToken: string | null = null;

  constructor(private prisma: PrismaService) {}

  /** Barcha sozlangan bot tokenlari (takrorlarsiz) */
  getTokens(): string[] {
    const raw = [
      process.env.TELEGRAM_BOT_TOKEN,
      process.env.TELEGRAM_BOT_TOKEN_2,
      ...(process.env.TELEGRAM_BOT_TOKENS ?? '').split(','),
    ];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const t of raw) {
      const token = (t ?? '').trim();
      if (!token || seen.has(token)) continue;
      seen.add(token);
      out.push(token);
    }
    return out;
  }

  get token(): string | null {
    return this.activeToken ?? this.getTokens()[0] ?? null;
  }

  isConfigured() {
    return this.getTokens().length > 0;
  }

  /** Handler/polling uchun token kontekstini o'rnatadi */
  async runWithToken<T>(token: string, fn: () => Promise<T>): Promise<T> {
    const prev = this.activeToken;
    this.activeToken = token;
    try {
      return await fn();
    } finally {
      this.activeToken = prev;
    }
  }

  private resolveToken(explicit?: string): string | null {
    return explicit || this.token;
  }

  /** Bot API metodini chaqirish. Xato bo'lsa null qaytaradi (log bilan). */
  async call<T = unknown>(
    method: string,
    payload: Record<string, unknown>,
    opts: CallOpts = {},
  ): Promise<T | null> {
    const token = this.resolveToken(opts.token);
    if (!token) return null;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 15_000);
    try {
      const res = await fetch(`${API_BASE}/bot${token}/${method}`, {
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

  /**
   * Xabarni yuboradi. Token berilmasa: faol kontekst → aks holda barcha botlar
   * bo'yicha ketma-ket urinadi (foydalanuvchi qaysi botga yozgan bo'lsa, o'sha ishlaydi).
   */
  async sendMessage(chatId: string, html: string, opts: SendOptions = {}) {
    const payload = {
      chat_id: chatId,
      text: html,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      ...(opts.replyMarkup ? { reply_markup: opts.replyMarkup } : {}),
    };

    if (opts.token || this.activeToken) {
      return this.call<{ message_id: number }>('sendMessage', payload, {
        token: opts.token,
        silent: true,
      });
    }

    for (const token of this.getTokens()) {
      const result = await this.call<{ message_id: number }>('sendMessage', payload, {
        token,
        silent: true,
      });
      if (result) return result;
    }
    this.logger.warn(`Telegram sendMessage muvaffaqiyatsiz (chat ${chatId})`);
    return null;
  }

  /** Barcha botlar orqali bir xil xabarni yuboradi (admin broadcast) */
  async sendMessageAll(chatId: string, html: string, opts: SendOptions = {}) {
    const tokens = this.getTokens();
    if (!tokens.length) return { sent: 0 };
    const results = await Promise.all(
      tokens.map((token) =>
        this.sendMessage(chatId, html, { ...opts, token }),
      ),
    );
    return { sent: results.filter(Boolean).length };
  }

  async editMessage(chatId: string, messageId: number, html: string, opts: SendOptions = {}) {
    return this.call('editMessageText', {
      chat_id: chatId,
      message_id: messageId,
      text: html,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      ...(opts.replyMarkup ? { reply_markup: opts.replyMarkup } : {}),
    }, { token: opts.token, silent: true });
  }

  async answerCallback(callbackId: string, text?: string, token?: string) {
    return this.call('answerCallbackQuery', {
      callback_query_id: callbackId,
      ...(text ? { text } : {}),
    }, { token, silent: true });
  }

  /** Bot username (login sahifasida ko'rsatish uchun, keshlangan — birinchi bot) */
  async getBotUsername(): Promise<string | null> {
    if (!this.isConfigured()) return null;
    if (this.botUsername) return this.botUsername;
    const primary = this.getTokens()[0];
    const me = await this.call<{ username?: string }>('getMe', {}, { token: primary });
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

  async createLoginCode(userId: string): Promise<string> {
    const row = await this.createLoginCodeRow(userId);
    return row.code;
  }

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
