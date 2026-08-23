import { Injectable, Logger } from '@nestjs/common';
import { randomInt } from 'crypto';
import { OrderStatus, TelegramCodePurpose, UserRole } from '@prisma/client';
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
 * TELEGRAM_BOT_TOKEN — asosiy interaktiv bot (polling, login, mijoz xabarlari).
 * TELEGRAM_ADMIN_BOT_TOKEN — faqat platforma adminiga xabar (eski bot).
 */
@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);
  private botUsername: string | null = null;
  /** Polling/handler ichida joriy bot tokeni */
  private activeToken: string | null = null;

  constructor(private prisma: PrismaService) {}

  private dedupe(tokens: Array<string | undefined | null>): string[] {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const t of tokens) {
      const token = (t ?? '').trim();
      if (!token || seen.has(token)) continue;
      seen.add(token);
      out.push(token);
    }
    return out;
  }

  /** Asosiy interaktiv bot */
  getPrimaryToken(): string | null {
    return this.dedupe([process.env.TELEGRAM_BOT_TOKEN])[0] ?? null;
  }

  /**
   * Faqat admin chatga platforma xabarlari (trial signup va hokazo).
   * TELEGRAM_ADMIN_BOT_TOKEN; eski TELEGRAM_BOT_TOKEN_2 ham qabul qilinadi.
   */
  getAdminNotifyTokens(): string[] {
    return this.dedupe([
      process.env.TELEGRAM_ADMIN_BOT_TOKEN,
      process.env.TELEGRAM_BOT_TOKEN_2,
    ]);
  }

  /** Polling uchun tokenlar — faqat asosiy bot */
  getTokens(): string[] {
    const primary = this.getPrimaryToken();
    return primary ? [primary] : [];
  }

  get token(): string | null {
    return this.activeToken ?? this.getPrimaryToken();
  }

  isConfigured() {
    return !!this.getPrimaryToken();
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
   * Xabarni yuboradi. Token berilmasa: faol kontekst → asosiy bot.
   */
  async sendMessage(chatId: string, html: string, opts: SendOptions = {}) {
    const payload = {
      chat_id: chatId,
      text: html,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      ...(opts.replyMarkup ? { reply_markup: opts.replyMarkup } : {}),
    };

    const token = opts.token || this.activeToken || this.getPrimaryToken();
    if (!token) {
      this.logger.warn(`Telegram sendMessage: token yo'q (chat ${chatId})`);
      return null;
    }
    return this.call<{ message_id: number }>('sendMessage', payload, {
      token,
      silent: true,
    });
  }

  /** Platforma admin chatiga (eski bot orqali) */
  async sendAdminNotify(chatId: string, html: string) {
    const tokens = this.getAdminNotifyTokens();
    if (!tokens.length) return { sent: 0 };
    const results = await Promise.all(
      tokens.map((token) => this.sendMessage(chatId, html, { token })),
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

  /** Asosiy bot username (login sahifasida ko'rsatish uchun) */
  async getBotUsername(): Promise<string | null> {
    const primary = this.getPrimaryToken();
    if (!primary) return null;
    if (this.botUsername) return this.botUsername;
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

  /**
   * Bir martalik kod yozuvi. `purpose` majburiy ajratuvchi: kirish uchun
   * berilgan kod parolni almashtirishga yaramaydi va aksincha.
   */
  async createLoginCodeRow(
    userId: string,
    purpose: TelegramCodePurpose = TelegramCodePurpose.login,
  ) {
    const code = String(randomInt(100000, 1000000));
    return this.prisma.telegramLoginCode.create({
      data: {
        userId,
        code,
        purpose,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      },
      select: { id: true, code: true },
    });
  }

  async deleteLoginCode(id: string) {
    await this.prisma.telegramLoginCode.delete({ where: { id } }).catch(() => {});
  }

  /**
   * Oxirgi kod HAQIQATAN yuborilgan vaqt — maqsad bo'yicha alohida.
   *
   * `attempt: false` sharti muhim: tekshirish urinishlari ham shu jadvalga
   * yoziladi, ularni hisobga olsak, begona odam faqat telefon raqamini bilib
   * turib qurbonning "yangi kod so'rash" imkonini doimiy yopib qo'ya olardi.
   */
  async lastLoginCodeAt(
    userId: string,
    purpose: TelegramCodePurpose = TelegramCodePurpose.login,
  ): Promise<Date | null> {
    const last = await this.prisma.telegramLoginCode.findFirst({
      where: { userId, purpose, attempt: false },
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
