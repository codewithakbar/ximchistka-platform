import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { OrderStatus, PaymentStatus, UserRole } from '@prisma/client';
import { VALID_STATUS_TRANSITIONS } from '@ximchistka/shared';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersService } from '../orders/orders.service';
import { ReportsService } from '../reports/reports.service';
import { orderScopeForUser } from '../branches/tenant-scope';
import { isDemoPeriodExpired } from '../auth/demo-expiry';
import { TelegramService, TgInlineButton, TgReplyKeyboard } from './telegram.service';
import {
  STATUS_EMOJI,
  STATUS_LABEL_UZ,
  customerOrderLine,
  escapeHtml,
  fmtPrice,
  looksLikeOrderNumber,
  orderDetailHtml,
  statusLine,
} from './telegram-format';

/* Klaviatura tugmalari (matn bo'yicha marshrutlash) */
const BTN_MY_ORDERS = '📦 Buyurtmalarim';
const BTN_LOGIN_CODE = '🔑 Kirish kodi';
const BTN_TODAY = '📊 Bugungi hisobot';
const BTN_SEARCH = '🔎 Buyurtma qidirish';
const BTN_NOTIF = '🔔 Bildirishnomalar';
const BTN_HELP = 'ℹ️ Yordam';
const BTN_SHARE_PHONE = '📱 Telefon raqamni yuborish';

const STATE_SEARCH = 'search_order';

type TgUpdate = {
  update_id: number;
  message?: TgMessage;
  callback_query?: {
    id: string;
    from: TgFrom;
    data?: string;
    message?: { message_id: number; chat: { id: number } };
  };
};

type TgFrom = { id: number; first_name?: string; username?: string };

type TgMessage = {
  message_id: number;
  from?: TgFrom;
  chat: { id: number; type: string };
  text?: string;
  contact?: { phone_number: string; user_id?: number };
};

type LinkedAccount = NonNullable<
  Awaited<ReturnType<TelegramService['findAccountByTelegramId']>>
>;

type StaffCtx = {
  id: string;
  role: UserRole;
  organizationId?: string;
  branchIds: string[];
};

@Injectable()
export class TelegramBotService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramBotService.name);
  private running = false;
  private offsets = new Map<string, number>();

  constructor(
    private telegram: TelegramService,
    private prisma: PrismaService,
    private orders: OrdersService,
    private reports: ReportsService,
  ) {}

  onModuleInit() {
    const tokens = this.telegram.getTokens();
    if (!tokens.length) {
      this.logger.log('TELEGRAM_BOT_TOKEN sozlanmagan — bot ishga tushmadi');
      return;
    }
    if (process.env.TELEGRAM_BOT_MODE === 'off') {
      this.logger.log('TELEGRAM_BOT_MODE=off — bot o\'chirilgan');
      return;
    }
    this.running = true;
    for (const token of tokens) {
      this.offsets.set(token, 0);
      void this.pollLoop(token);
    }
    this.logger.log('Telegram bot long-polling: asosiy bot ishga tushdi');
  }

  onModuleDestroy() {
    this.running = false;
  }

  /* ---------------------------------------------------------------- */
  /* Long polling                                                      */
  /* ---------------------------------------------------------------- */

  private async pollLoop(token: string) {
    await this.telegram.runWithToken(token, async () => {
      await this.telegram.call('deleteWebhook', {}, { silent: true });
      await this.telegram.call(
        'setMyCommands',
        {
          commands: [
            { command: 'start', description: 'Boshlash / hisobni ulash' },
            { command: 'help', description: 'Yordam' },
            { command: 'unlink', description: 'Hisobni uzish' },
          ],
        },
        { silent: true },
      );
    });

    while (this.running) {
      const offset = this.offsets.get(token) ?? 0;
      const updates = await this.telegram.runWithToken(token, () =>
        this.telegram.call<TgUpdate[]>(
          'getUpdates',
          {
            offset,
            timeout: 25,
            allowed_updates: ['message', 'callback_query'],
          },
          { timeoutMs: 35_000, silent: true },
        ),
      );

      if (updates === null) {
        await this.sleep(3000);
        continue;
      }

      for (const update of updates) {
        this.offsets.set(token, update.update_id + 1);
        try {
          await this.telegram.runWithToken(token, () => this.handleUpdate(update));
        } catch (err) {
          this.logger.warn(`Telegram update xato: ${String(err)}`);
        }
      }
    }
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /* ---------------------------------------------------------------- */
  /* Marshrutlash                                                      */
  /* ---------------------------------------------------------------- */

  private async handleUpdate(update: TgUpdate) {
    if (update.callback_query) {
      await this.handleCallback(update.callback_query);
      return;
    }
    const msg = update.message;
    if (!msg || msg.chat.type !== 'private' || !msg.from) return;

    const chatId = String(msg.chat.id);
    const telegramId = String(msg.from.id);

    if (msg.contact) {
      await this.handleContact(msg, chatId, telegramId);
      return;
    }

    const text = (msg.text ?? '').trim();
    if (!text) return;

    let account = await this.telegram.findAccountByTelegramId(telegramId);

    if (text === '/start') {
      await this.handleStart(account, msg.from, chatId, telegramId);
      return;
    }

    if (!account?.user) {
      // Hali bog'lanmagan — telefon so'raymiz
      await this.askContact(chatId, msg.from, telegramId);
      return;
    }

    if (text === '/unlink') {
      await this.unlinkAccount(telegramId);
      await this.telegram.sendMessage(
        chatId,
        'Hisobingiz uzildi. Qayta ulash uchun /start yuboring.',
        { replyMarkup: { remove_keyboard: true } },
      );
      return;
    }

    // Har bir amaldan oldin hisob hali faolligini qayta tekshiramiz
    const status = this.accountStatus(account);
    if (!status.ok) {
      await this.telegram.sendMessage(
        chatId,
        `⚠️ ${status.reason ?? 'Ruxsat yo\'q.'}`,
        { replyMarkup: { remove_keyboard: true } },
      );
      return;
    }

    const role = account.user.role;

    // Tanilgan tugma/buyruq — kutilayotgan qidiruv holatini tozalaymiz
    const KNOWN = new Set([
      BTN_MY_ORDERS, BTN_LOGIN_CODE, BTN_TODAY, BTN_SEARCH,
      BTN_NOTIF, BTN_HELP, '/help', '/start', '/unlink',
    ]);
    if (account.botState === STATE_SEARCH && KNOWN.has(text)) {
      await this.telegram.setState(telegramId, null);
      account = { ...account, botState: null };
    }

    switch (text) {
      case BTN_MY_ORDERS:
        if (role === UserRole.customer) {
          await this.sendCustomerOrders(account, chatId);
        } else {
          await this.telegram.sendMessage(chatId, this.helpText(role));
        }
        return;
      case BTN_LOGIN_CODE:
        await this.sendLoginCode(account, chatId);
        return;
      case BTN_TODAY:
        if (role === UserRole.super_admin) {
          await this.sendTodayReport(account, chatId);
        }
        return;
      case BTN_SEARCH:
        if (this.isStaff(role)) {
          await this.telegram.setState(telegramId, STATE_SEARCH);
          await this.telegram.sendMessage(
            chatId,
            "Chek raqamini yuboring (masalan: <code>CH1-0100</code>)",
          );
        }
        return;
      case BTN_NOTIF:
        await this.toggleNotifications(account, chatId, telegramId);
        return;
      case BTN_HELP:
      case '/help':
        await this.telegram.sendMessage(chatId, this.helpText(role), {
          replyMarkup: this.keyboardFor(role),
        });
        return;
    }

    // Holat: buyurtma qidirish kutilmoqda
    if (account.botState === STATE_SEARCH && this.isStaff(role)) {
      await this.telegram.setState(telegramId, null);
      await this.staffSearchOrder(account, chatId, text);
      return;
    }

    // Chek raqamiga o'xshagan matn — qidirish
    if (looksLikeOrderNumber(text)) {
      if (this.isStaff(role)) {
        await this.staffSearchOrder(account, chatId, text);
      } else {
        await this.customerFindOrder(account, chatId, text);
      }
      return;
    }

    await this.telegram.sendMessage(chatId, this.helpText(role), {
      replyMarkup: this.keyboardFor(role),
    });
  }

  /* ---------------------------------------------------------------- */
  /* Bog'lash                                                          */
  /* ---------------------------------------------------------------- */

  private async handleStart(
    account: LinkedAccount | null,
    from: TgFrom,
    chatId: string,
    telegramId: string,
  ) {
    if (account?.user) {
      const name = escapeHtml(account.user.fullName);
      await this.telegram.sendMessage(
        chatId,
        `Assalomu alaykum, <b>${name}</b>! 👋\n${this.roleIntro(account.user.role, account.user.organization?.name)}`,
        { replyMarkup: this.keyboardFor(account.user.role) },
      );
      return;
    }
    await this.askContact(chatId, from, telegramId);
  }

  private async askContact(chatId: string, from: TgFrom, telegramId: string) {
    await this.telegram.upsertAnonymous({
      telegramId,
      chatId,
      username: from.username,
      firstName: from.first_name,
    });
    const keyboard: TgReplyKeyboard = {
      keyboard: [[{ text: BTN_SHARE_PHONE, request_contact: true }]],
      resize_keyboard: true,
      one_time_keyboard: true,
    };
    await this.telegram.sendMessage(
      chatId,
      'Assalomu alaykum! Bu — <b>CleanWay</b> rasmiy boti. 🧺\n\n' +
        'Hisobingizni ulash uchun quyidagi tugma orqali telefon raqamingizni yuboring. ' +
        "Raqam tizimda ro'yxatdan o'tgan bo'lishi kerak (mijoz yoki xodim).",
      { replyMarkup: keyboard },
    );
  }

  private async handleContact(msg: TgMessage, chatId: string, telegramId: string) {
    const contact = msg.contact!;
    // Faqat O'ZINING raqamini qabul qilamiz — boshqa odam kontaktini emas
    if (contact.user_id !== msg.from?.id) {
      await this.telegram.sendMessage(
        chatId,
        "Iltimos, tugma orqali o'z raqamingizni yuboring.",
      );
      return;
    }

    const phone = this.normalizePhone(contact.phone_number);
    const user = await this.prisma.user.findUnique({
      where: { phone },
      include: { organization: true },
    });

    if (!user || !user.isActive) {
      await this.telegram.sendMessage(
        chatId,
        `<b>${escapeHtml(phone)}</b> raqami tizimda topilmadi.\n\n` +
          "Agar siz mijoz bo'lsangiz — filialga murojaat qiling, xodim bo'lsangiz — administratoringizga ayting.",
        { replyMarkup: { remove_keyboard: true } },
      );
      return;
    }

    await this.telegram.linkAccount({
      telegramId,
      chatId,
      userId: user.id,
      username: msg.from?.username,
      firstName: msg.from?.first_name,
    });

    await this.telegram.sendMessage(
      chatId,
      `✅ Hisobingiz ulandi, <b>${escapeHtml(user.fullName)}</b>!\n${this.roleIntro(user.role, user.organization?.name)}`,
      { replyMarkup: this.keyboardFor(user.role) },
    );
  }

  private roleIntro(role: UserRole, orgName?: string | null): string {
    const org = orgName ? `\n🏢 ${escapeHtml(orgName)}` : '';
    switch (role) {
      case UserRole.customer:
        return (
          'Endi buyurtmalaringiz holatini shu yerda kuzatishingiz mumkin — holat o\'zgarganda o\'zim xabar beraman. 🔔' +
          '\n\n📦 tugmasini bosing yoki chek raqamini yuboring.'
        );
      case UserRole.super_admin:
        return (
          org +
          '\nSiz — tashkilot egasi sifatida ulandingiz:' +
          '\n• Yangi buyurtma va to\'lovlar haqida xabar olasiz' +
          '\n• 📊 Bugungi hisobot va kassa' +
          '\n• 🔎 Buyurtma qidirish va holatini o\'zgartirish' +
          '\n• 🔑 CRM ga kodsiz kirish'
        );
      case UserRole.platform_admin:
        return '\nPlatforma admini sifatida 🔑 kirish kodidan foydalanishingiz mumkin.';
      default:
        return (
          org +
          '\nXodim sifatida ulandingiz:' +
          '\n• 🔑 CRM ga parolsiz kirish kodi' +
          '\n• 🔎 Buyurtma qidirish va holatini o\'zgartirish' +
          '\n• 📊 Bugungi hisobot'
        );
    }
  }

  /** Hisobni uzish: bog'lanish va faol kirish kodlarini bekor qiladi */
  private async unlinkAccount(telegramId: string) {
    const account = await this.prisma.telegramAccount.findUnique({
      where: { telegramId },
      select: { userId: true },
    });
    await this.prisma.telegramAccount.update({
      where: { telegramId },
      data: { userId: null, botState: null },
    });
    // Uzilgan hisobning kutilayotgan login kodlari ishlamasin
    if (account?.userId) {
      await this.prisma.telegramLoginCode.updateMany({
        where: { userId: account.userId, used: false },
        data: { used: true },
      });
    }
  }

  /* ---------------------------------------------------------------- */
  /* Klaviaturalar va yordam                                           */
  /* ---------------------------------------------------------------- */

  /**
   * Bog'langan hisob hali ham faolmi? HTTP so'rovlar har safar JwtStrategy da
   * tekshiriladi, lekin bot userId ni doimiy saqlaydi — shuning uchun har bir
   * amaldan oldin qayta tekshiramiz (ishdan bo'shatilgan xodim / to'xtatilgan
   * yoki demo tugagan tashkilot botdan foydalana olmasligi kerak).
   */
  private accountStatus(account: LinkedAccount): {
    ok: boolean;
    reason?: string;
    demoExpired: boolean;
  } {
    const user = account.user;
    if (!user || !user.isActive) {
      return { ok: false, reason: 'Hisobingiz faol emas.', demoExpired: false };
    }
    if (user.role === UserRole.customer || user.role === UserRole.platform_admin) {
      return { ok: true, demoExpired: false };
    }
    const org = user.organization;
    if (!org || !org.isActive || org.plan === 'suspended') {
      return { ok: false, reason: 'Tashkilot faol emas.', demoExpired: false };
    }
    return { ok: true, demoExpired: isDemoPeriodExpired(org) };
  }

  private isStaff(role: UserRole) {
    return role !== UserRole.customer && role !== UserRole.platform_admin;
  }

  private keyboardFor(role: UserRole): TgReplyKeyboard {
    if (role === UserRole.customer) {
      return { keyboard: [[BTN_MY_ORDERS], [BTN_HELP]], resize_keyboard: true };
    }
    if (role === UserRole.platform_admin) {
      return { keyboard: [[BTN_LOGIN_CODE], [BTN_HELP]], resize_keyboard: true };
    }
    if (role === UserRole.super_admin) {
      return {
        keyboard: [
          [BTN_LOGIN_CODE],
          [BTN_SEARCH, BTN_TODAY],
          [BTN_NOTIF, BTN_HELP],
        ],
        resize_keyboard: true,
      };
    }
    return {
      keyboard: [[BTN_LOGIN_CODE], [BTN_SEARCH, BTN_TODAY], [BTN_HELP]],
      resize_keyboard: true,
    };
  }

  private helpText(role: UserRole): string {
    if (role === UserRole.platform_admin) {
      return (
        'ℹ️ <b>Yordam</b>\n\n' +
        `${BTN_LOGIN_CODE} — platforma paneliga parolsiz kirish kodi\n\n` +
        '/unlink — hisobni uzish'
      );
    }
    if (role === UserRole.customer) {
      return (
        'ℹ️ <b>Yordam</b>\n\n' +
        `${BTN_MY_ORDERS} — buyurtmalaringiz va holatlari\n` +
        'Chek raqamini yuborsangiz (masalan <code>CH1-0100</code>) — holatini ko\'rasiz\n' +
        'Holat o\'zgarganda avtomatik xabar olasiz 🔔\n\n' +
        '/unlink — hisobni uzish'
      );
    }
    return (
      'ℹ️ <b>Yordam</b>\n\n' +
      `${BTN_LOGIN_CODE} — CRM ga parolsiz kirish uchun bir martalik kod\n` +
      `${BTN_SEARCH} — chek raqami bo'yicha buyurtma (holatini shu yerdan o'zgartirish mumkin)\n` +
      `${BTN_TODAY} — bugungi buyurtmalar, tushum va kassa\n\n` +
      '/unlink — hisobni uzish'
    );
  }

  /* ---------------------------------------------------------------- */
  /* Kirish kodi                                                       */
  /* ---------------------------------------------------------------- */

  private async sendLoginCode(account: LinkedAccount, chatId: string) {
    const user = account.user!;
    if (user.role === UserRole.customer) {
      await this.telegram.sendMessage(chatId, this.helpText(user.role));
      return;
    }
    const created = await this.telegram.createLoginCodeRow(user.id);
    const sent = await this.telegram.sendMessage(
      chatId,
      '🔐 CRM ga kirish kodi:\n\n' +
        `<code>${created.code}</code>\n\n` +
        `Kirish sahifasida "Telegram orqali" bo'limiga telefon raqamingiz va shu kodni kiriting. ` +
        'Kod <b>5 daqiqa</b> amal qiladi.',
    );
    if (!sent) await this.telegram.deleteLoginCode(created.id);
  }

  /* ---------------------------------------------------------------- */
  /* Mijoz: buyurtmalar                                                */
  /* ---------------------------------------------------------------- */

  private async sendCustomerOrders(account: LinkedAccount, chatId: string) {
    const profileId = account.user?.customerProfile?.id;
    if (!profileId) {
      await this.telegram.sendMessage(chatId, 'Sizda hali buyurtmalar yo\'q.');
      return;
    }

    const orders = await this.prisma.order.findMany({
      where: { customerId: profileId },
      include: {
        branch: { select: { name: true } },
        payments: { select: { status: true, amount: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    if (!orders.length) {
      await this.telegram.sendMessage(chatId, 'Sizda hali buyurtmalar yo\'q.');
      return;
    }

    const lines = orders.map((o) =>
      customerOrderLine({
        orderNumber: o.orderNumber,
        status: o.status,
        totalAmount: o.totalAmount,
        paidAmount: this.paidOf(o.payments),
        createdAt: o.createdAt,
        branchName: o.branch.name,
      }),
    );

    // Faol buyurtmalar uchun tafsilot tugmalari
    const active = orders.filter(
      (o) => o.status !== OrderStatus.completed && o.status !== OrderStatus.cancelled,
    );
    const buttons: TgInlineButton[][] = active
      .slice(0, 5)
      .map((o) => [{ text: `📦 ${o.orderNumber}`, callback_data: `co|${o.id}` }]);

    await this.telegram.sendMessage(
      chatId,
      `<b>Sizning buyurtmalaringiz</b> (oxirgi ${orders.length} ta):\n\n` +
        lines.join('\n\n'),
      buttons.length ? { replyMarkup: { inline_keyboard: buttons } } : {},
    );
  }

  private async customerFindOrder(account: LinkedAccount, chatId: string, query: string) {
    const profileId = account.user?.customerProfile?.id;
    const number = query.trim().toUpperCase();

    const order = profileId
      ? await this.prisma.order.findFirst({
          where: { customerId: profileId, orderNumber: { equals: number, mode: 'insensitive' } },
          include: this.detailInclude(),
        })
      : null;

    if (order) {
      await this.telegram.sendMessage(chatId, this.renderDetail(order, false));
      return;
    }

    // O'ziniki emas — ommaviy kuzatuv darajasida javob beramiz
    const publicOrder = await this.prisma.order.findFirst({
      where: { orderNumber: { equals: number, mode: 'insensitive' } },
      select: {
        orderNumber: true,
        status: true,
        branch: { select: { name: true } },
        estimatedReady: true,
      },
    });
    if (!publicOrder) {
      await this.telegram.sendMessage(chatId, `<b>${escapeHtml(number)}</b> topilmadi.`);
      return;
    }
    await this.telegram.sendMessage(
      chatId,
      `📦 <b>${escapeHtml(publicOrder.orderNumber)}</b>\n` +
        `${statusLine(publicOrder.status)}\n🏬 ${escapeHtml(publicOrder.branch.name)}`,
    );
  }

  /* ---------------------------------------------------------------- */
  /* Xodim: qidiruv, holat, hisobot                                    */
  /* ---------------------------------------------------------------- */

  private staffCtx(account: LinkedAccount): StaffCtx {
    const user = account.user!;
    return {
      id: user.id,
      role: user.role,
      organizationId: user.organizationId ?? undefined,
      branchIds: user.userBranches.map((b) => b.branchId),
    };
  }

  private async staffSearchOrder(account: LinkedAccount, chatId: string, query: string) {
    const ctx = this.staffCtx(account);
    const scope = orderScopeForUser(ctx);
    const q = query.trim();

    const orders = await this.prisma.order.findMany({
      where: { ...scope, orderNumber: { contains: q, mode: 'insensitive' } },
      include: this.detailInclude(),
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    if (!orders.length) {
      await this.telegram.sendMessage(
        chatId,
        `<b>${escapeHtml(q)}</b> bo'yicha buyurtma topilmadi.`,
      );
      return;
    }

    if (orders.length > 1) {
      const buttons: TgInlineButton[][] = orders.map((o) => [
        {
          text: `${STATUS_EMOJI[o.status]} ${o.orderNumber} · ${fmtPrice(o.totalAmount)}`,
          callback_data: `so|${o.id}`,
        },
      ]);
      await this.telegram.sendMessage(chatId, `${orders.length} ta buyurtma topildi:`, {
        replyMarkup: { inline_keyboard: buttons },
      });
      return;
    }

    const order = orders[0];
    await this.telegram.sendMessage(chatId, this.renderDetail(order, true), {
      replyMarkup: { inline_keyboard: this.statusButtons(order) },
    });
  }

  /** Ruxsat etilgan keyingi holatlar uchun tugmalar */
  private statusButtons(order: { id: string; status: OrderStatus }): TgInlineButton[][] {
    const allowed =
      VALID_STATUS_TRANSITIONS[order.status as keyof typeof VALID_STATUS_TRANSITIONS] ?? [];
    return allowed.map((next) => [
      {
        text: `${STATUS_EMOJI[next as OrderStatus]} ${STATUS_LABEL_UZ[next as OrderStatus]}`,
        callback_data: `st|${order.id}|${next}`,
      },
    ]);
  }

  private async sendTodayReport(account: LinkedAccount, chatId: string) {
    const user = account.user!;
    // Kunlik tushum/kassa — HTTP dagi kabi faqat super_admin uchun
    if (user.role !== UserRole.super_admin) {
      await this.telegram.sendMessage(chatId, this.helpText(user.role));
      return;
    }
    const ctx = this.staffCtx(account);
    const today = new Date().toISOString().slice(0, 10);
    const report = await this.reports.dailyReport(today, today, ctx);

    const lines = [
      `📊 <b>Bugungi hisobot</b> (${today})`,
      '',
      `📦 Buyurtmalar: <b>${report.totalOrders}</b>` +
        (report.cancelledOrders ? ` (❌ ${report.cancelledOrders} bekor)` : ''),
      `💵 Tushum: <b>${fmtPrice(report.totalRevenue)}</b>`,
    ];

    if (report.kassa && report.kassa.totalPaid > 0) {
      lines.push('', `🧾 <b>Kassa</b> — qabul qilingan: ${fmtPrice(report.kassa.totalPaid)}`);
      const providerNames: Record<string, string> = {
        cash: 'Naqd',
        click: 'Click',
        transfer: "O'tkazma",
        payme: 'Payme',
        uzum: 'Uzum',
      };
      for (const row of report.kassa.byProvider) {
        lines.push(`  • ${providerNames[row.provider] ?? row.provider}: ${fmtPrice(row.amount)}`);
      }
    } else {
      lines.push('', '🧾 Kassa: bugun to\'lovlar yo\'q');
    }

    await this.telegram.sendMessage(chatId, lines.join('\n'));
  }

  private async toggleNotifications(
    account: LinkedAccount,
    chatId: string,
    telegramId: string,
  ) {
    if (account.user?.role !== UserRole.super_admin) return;
    const updated = await this.prisma.telegramAccount.update({
      where: { telegramId },
      data: { notifyEnabled: !account.notifyEnabled },
    });
    await this.telegram.sendMessage(
      chatId,
      updated.notifyEnabled
        ? '🔔 Bildirishnomalar <b>yoqildi</b> — yangi buyurtma va to\'lovlar haqida xabar olasiz.'
        : '🔕 Bildirishnomalar <b>o\'chirildi</b>.',
    );
  }

  /* ---------------------------------------------------------------- */
  /* Callback tugmalar                                                 */
  /* ---------------------------------------------------------------- */

  private async handleCallback(cb: NonNullable<TgUpdate['callback_query']>) {
    const telegramId = String(cb.from.id);
    const account = await this.telegram.findAccountByTelegramId(telegramId);
    if (!account?.user || !cb.data || !cb.message) {
      await this.telegram.answerCallback(cb.id);
      return;
    }

    const status = this.accountStatus(account);
    if (!status.ok) {
      await this.telegram.answerCallback(cb.id, `⚠️ ${status.reason ?? 'Ruxsat yo\'q'}`);
      return;
    }

    const chatId = String(cb.message.chat.id);
    const [action, orderId, extra] = cb.data.split('|');

    try {
      if (action === 'co') {
        // Mijoz: o'z buyurtmasi tafsiloti
        const profileId = account.user.customerProfile?.id;
        const order = profileId
          ? await this.prisma.order.findFirst({
              where: { id: orderId, customerId: profileId },
              include: this.detailInclude(),
            })
          : null;
        await this.telegram.answerCallback(cb.id);
        if (order) {
          await this.telegram.sendMessage(chatId, this.renderDetail(order, false));
        }
        return;
      }

      if (action === 'so' && this.isStaff(account.user.role)) {
        const ctx = this.staffCtx(account);
        const order = await this.prisma.order.findFirst({
          where: { id: orderId, ...orderScopeForUser(ctx) },
          include: this.detailInclude(),
        });
        await this.telegram.answerCallback(cb.id);
        if (order) {
          await this.telegram.sendMessage(chatId, this.renderDetail(order, true), {
            replyMarkup: { inline_keyboard: this.statusButtons(order) },
          });
        }
        return;
      }

      if (action === 'st' && this.isStaff(account.user.role)) {
        if (status.demoExpired) {
          await this.telegram.answerCallback(
            cb.id,
            '⚠️ Demo muddati tugagan — o\'zgartirish mumkin emas',
          );
          return;
        }
        const ctx = this.staffCtx(account);
        // OrdersService.updateStatus barcha tekshiruv va bildirishnomalarni bajaradi
        await this.orders.updateStatus(orderId, extra as OrderStatus, ctx);
        await this.telegram.answerCallback(cb.id, '✅ Holat o\'zgartirildi');

        const order = await this.prisma.order.findFirst({
          where: { id: orderId, ...orderScopeForUser(ctx) },
          include: this.detailInclude(),
        });
        if (order) {
          await this.telegram.editMessage(
            chatId,
            cb.message.message_id,
            this.renderDetail(order, true),
            { replyMarkup: { inline_keyboard: this.statusButtons(order) } },
          );
        }
        return;
      }

      await this.telegram.answerCallback(cb.id);
    } catch (err) {
      const message =
        err instanceof BadRequestException ||
        err instanceof ForbiddenException ||
        err instanceof NotFoundException
          ? (err as Error).message
          : 'Xatolik yuz berdi';
      await this.telegram.answerCallback(cb.id, `⚠️ ${message}`.slice(0, 190));
    }
  }

  /* ---------------------------------------------------------------- */
  /* Umumiy                                                            */
  /* ---------------------------------------------------------------- */

  private detailInclude() {
    return {
      branch: { select: { name: true } },
      customer: { include: { user: { select: { fullName: true, phone: true } } } },
      items: { include: { service: { select: { name: true } } } },
      payments: { select: { status: true, amount: true } },
      statusHistory: {
        select: { status: true, createdAt: true },
        orderBy: { createdAt: 'asc' as const },
      },
    };
  }

  private renderDetail(
    order: {
      orderNumber: string;
      status: OrderStatus;
      totalAmount: number;
      createdAt: Date;
      estimatedReady: Date | null;
      branch: { name: string };
      customer: { user: { fullName: string; phone: string } };
      items: { quantity: number; unitPrice: number; notes?: string | null; service: { name: string } }[];
      payments: { status: PaymentStatus; amount: number }[];
      statusHistory: { status: OrderStatus; createdAt: Date }[];
    },
    forStaff: boolean,
  ): string {
    return orderDetailHtml(
      {
        orderNumber: order.orderNumber,
        status: order.status,
        totalAmount: order.totalAmount,
        paidAmount: this.paidOf(order.payments),
        createdAt: order.createdAt,
        estimatedReady: order.estimatedReady,
        branchName: order.branch.name,
        customerName: order.customer.user.fullName,
        customerPhone: order.customer.user.phone,
        items: order.items.map((i) => ({
          name: i.service.name,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          notes: i.notes,
        })),
        history: order.statusHistory,
      },
      { forStaff },
    );
  }

  private paidOf(payments: { status: PaymentStatus; amount: number }[]) {
    return payments
      .filter((p) => p.status === PaymentStatus.paid)
      .reduce((sum, p) => sum + p.amount, 0);
  }

  private normalizePhone(phone: string) {
    const digits = phone.replace(/\D/g, '');
    if (digits.startsWith('998')) return `+${digits}`;
    if (digits.length === 9) return `+998${digits}`;
    return phone.startsWith('+') ? phone : `+${digits}`;
  }
}
