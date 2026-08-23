import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { OrganizationPlan, TelegramCodePurpose, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TelegramService } from '../telegram/telegram.service';
import { isDemoPeriodExpired } from './demo-expiry';

/** Bitta telefon raqamiga OTP so'rovlari orasidagi eng qisqa vaqt */
const OTP_COOLDOWN_MS = 60_000;

/** Telegram kirish kodlari orasidagi eng qisqa vaqt */
const TELEGRAM_CODE_COOLDOWN_MS = 60_000;

/** Brute-force oynasi va shu oynadagi eng ko'p urinish (kod + noto'g'ri) */
const TELEGRAM_CODE_WINDOW_MS = 5 * 60_000;
const TELEGRAM_CODE_MAX_ATTEMPTS = 8;

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private notifications: NotificationsService,
    private telegram: TelegramService,
  ) {}

  /**
   * Xodim va platforma admin kirishi. Merchant panel ham shu endpointdan
   * foydalanadi, shuning uchun platforma adminni bu yerda rad etib bo'lmaydi —
   * aks holda u hech qayerga kira olmaydi. CRM o'zi platforma adminni tanib
   * olib, merchant panelga yo'naltiradi (login sahifasi va AppShell).
   */
  async staffLogin(phone: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { phone },
      include: { userBranches: true, organization: true },
    });
    if (!user || !user.passwordHash || user.role === UserRole.customer) {
      throw new UnauthorizedException('Telefon yoki parol noto\'g\'ri');
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Telefon yoki parol noto\'g\'ri');
    await this.assertOrganizationActive(user);
    return this.issueTokens(user);
  }

  /** Login sahifasi uchun bot ma'lumoti */
  async telegramBotInfo() {
    return {
      configured: this.telegram.isConfigured(),
      username: await this.telegram.getBotUsername(),
    };
  }

  /**
   * Telegram orqali kirish: bog'langan botga bir martalik kod yuboriladi.
   * Xodimlar uchun (mijoz emas) — CRM kirish sahifasidan chaqiriladi.
   */
  async requestTelegramLogin(phone: string) {
    if (!this.telegram.isConfigured()) {
      throw new BadRequestException('Telegram bot sozlanmagan');
    }

    const normalized = this.normalizePhone(phone);
    const user = await this.prisma.user.findUnique({
      where: { phone: normalized },
      include: { organization: true },
    });
    if (!user || !user.isActive || user.role === UserRole.customer) {
      throw new BadRequestException('Bu raqam bilan xodim topilmadi');
    }
    if (user.role === UserRole.platform_admin) {
      throw new BadRequestException(
        'Platforma admin CRM ga kira olmaydi. Admin panelni ishlating.',
      );
    }
    await this.assertOrganizationActive(user);

    const account = await this.telegram.findAccountByUserId(user.id);
    const botUsername = await this.telegram.getBotUsername();
    if (!account) {
      throw new BadRequestException(
        `Telegram ulanmagan. @${botUsername ?? 'bot'} ga /start yuborib, telefon raqamingizni ulang`,
      );
    }

    // Spam himoyasi: bitta foydalanuvchiga 60 soniyada bitta kod
    const lastAt = await this.telegram.lastLoginCodeAt(user.id);
    if (lastAt && Date.now() - lastAt.getTime() < TELEGRAM_CODE_COOLDOWN_MS) {
      const wait = Math.ceil(
        (TELEGRAM_CODE_COOLDOWN_MS - (Date.now() - lastAt.getTime())) / 1000,
      );
      throw new BadRequestException(`Yangi kod so'rash uchun ${wait} soniya kuting`);
    }

    const created = await this.telegram.createLoginCodeRow(user.id);
    const sent = await this.telegram.sendMessage(
      account.chatId,
      '🔐 CRM ga kirish kodi:\n\n' +
        `<code>${created.code}</code>\n\n` +
        'Kod <b>5 daqiqa</b> amal qiladi. Agar siz so\'ramagan bo\'lsangiz — e\'tiborsiz qoldiring.',
    );
    if (!sent) {
      // Yuborilmagan kod cooldown/urinish hisobini band qilmasligi kerak
      await this.telegram.deleteLoginCode(created.id);
      throw new BadRequestException(
        'Telegramga yuborib bo\'lmadi — botni bloklagan bo\'lishingiz mumkin',
      );
    }

    return { message: 'Kod Telegramga yuborildi' };
  }

  /** Telegram kodi bilan kirish */
  async verifyTelegramLogin(phone: string, code: string) {
    const normalized = this.normalizePhone(phone);
    const user = await this.prisma.user.findUnique({
      where: { phone: normalized },
      include: { userBranches: true, organization: true },
    });
    // Enumeration oracle bo'lmasligi uchun har doim bir xil xabar
    const invalid = () =>
      new UnauthorizedException('Telefon yoki kod noto\'g\'ri');
    if (!user || !user.isActive || user.role === UserRole.customer) {
      throw invalid();
    }
    if (user.role === UserRole.platform_admin) {
      throw invalid();
    }

    await this.consumeTelegramCode(
      user.id,
      code,
      TelegramCodePurpose.login,
      invalid,
    );

    await this.assertOrganizationActive(user);
    return this.issueTokens(user);
  }

  /**
   * Bir martalik kodni tekshirib, ishlatilgan deb belgilaydi.
   *
   * Kod maqsadi bo'yicha qat'iy ajratiladi — kirish uchun berilgan kod
   * parolni tiklashga yaramaydi. Brute-force himoyasi ham har bir maqsad
   * uchun alohida hisoblanadi.
   */
  private async consumeTelegramCode(
    userId: string,
    code: string,
    purpose: TelegramCodePurpose,
    invalid: () => Error,
  ) {
    // Urinishni AVVAL yozamiz, keyin sanaymiz — shunda har bir so'rov o'zini
    // ham hisoblaydi va bir vaqtda kelgan so'rovlar cheklovni chetlab o'ta
    // olmaydi. Urinish yozuvi `attempt: true` bilan belgilanadi, shuning
    // uchun u kod yuborish oralig'iga ta'sir qilmaydi.
    await this.prisma.telegramLoginCode.create({
      data: {
        userId,
        purpose,
        attempt: true,
        code: 'x',
        used: true,
        expiresAt: new Date(),
      },
    });

    const since = new Date(Date.now() - TELEGRAM_CODE_WINDOW_MS);
    const recentAttempts = await this.prisma.telegramLoginCode.count({
      where: { userId, purpose, attempt: true, createdAt: { gt: since } },
    });
    if (recentAttempts > TELEGRAM_CODE_MAX_ATTEMPTS) {
      // Yuborilgan kodni bekor QILMAYMIZ: aks holda begona odam faqat telefon
      // raqamini bilib, qurbonning kodini kuydirib yuborishi mumkin edi.
      // Kod baribir 5 daqiqada o'zi tugaydi.
      throw new UnauthorizedException(
        'Juda ko\'p urinish. Bir necha daqiqadan so\'ng qayta urinib ko\'ring.',
      );
    }

    const row = await this.prisma.telegramLoginCode.findFirst({
      where: {
        userId,
        purpose,
        attempt: false,
        code: code.trim(),
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!row) throw invalid();

    await this.prisma.telegramLoginCode.update({
      where: { id: row.id },
      data: { used: true },
    });
  }

  /* ---------------------------------------------------------------- */
  /* Parolni tiklash (Telegram orqali)                                 */
  /* ---------------------------------------------------------------- */

  /**
   * "Parolni unutdingizmi" — bog'langan Telegramga tiklash kodi yuboradi.
   * Faqat parol bilan ishlaydigan xodimlar uchun: mijozlar OTP bilan kiradi,
   * platforma admin esa CRM dan foydalanmaydi.
   */
  async requestPasswordReset(phone: string) {
    if (!this.telegram.isConfigured()) {
      throw new BadRequestException('Telegram bot sozlanmagan');
    }

    const normalized = this.normalizePhone(phone);
    const user = await this.prisma.user.findUnique({
      where: { phone: normalized },
      include: { organization: true },
    });
    if (!user || !this.isResettable(user)) {
      throw new BadRequestException('Bu raqam bilan xodim topilmadi');
    }
    await this.assertOrganizationActive(user);

    const account = await this.telegram.findAccountByUserId(user.id);
    const botUsername = await this.telegram.getBotUsername();
    if (!account) {
      throw new BadRequestException(
        `Telegram ulanmagan. @${botUsername ?? 'bot'} ga /start yuborib, telefon raqamingizni ulang`,
      );
    }

    // Spam himoyasi: bitta foydalanuvchiga 60 soniyada bitta tiklash kodi
    const lastAt = await this.telegram.lastLoginCodeAt(
      user.id,
      TelegramCodePurpose.password_reset,
    );
    if (lastAt && Date.now() - lastAt.getTime() < TELEGRAM_CODE_COOLDOWN_MS) {
      const wait = Math.ceil(
        (TELEGRAM_CODE_COOLDOWN_MS - (Date.now() - lastAt.getTime())) / 1000,
      );
      throw new BadRequestException(`Yangi kod so'rash uchun ${wait} soniya kuting`);
    }

    const created = await this.telegram.createLoginCodeRow(
      user.id,
      TelegramCodePurpose.password_reset,
    );
    const sent = await this.telegram.sendMessage(
      account.chatId,
      '🔑 <b>Parolni tiklash kodi:</b>\n\n' +
        `<code>${created.code}</code>\n\n` +
        'Kod <b>5 daqiqa</b> amal qiladi.\n' +
        'Agar siz so\'ramagan bo\'lsangiz — hech kimga bermang va e\'tiborsiz qoldiring.',
    );
    if (!sent) {
      // Yuborilmagan kod cooldown/urinish hisobini band qilmasligi kerak
      await this.telegram.deleteLoginCode(created.id);
      throw new BadRequestException(
        'Telegramga yuborib bo\'lmadi — botni bloklagan bo\'lishingiz mumkin',
      );
    }

    return { message: 'Kod Telegramga yuborildi' };
  }

  /** Tiklash kodi bilan yangi parol o'rnatish */
  async confirmPasswordReset(phone: string, code: string, newPassword: string) {
    if (newPassword.length < 6) {
      throw new BadRequestException(
        'Yangi parol kamida 6 belgidan iborat bo\'lishi kerak',
      );
    }

    const normalized = this.normalizePhone(phone);
    const user = await this.prisma.user.findUnique({
      where: { phone: normalized },
      include: { organization: true },
    });
    // Enumeration oracle bo'lmasligi uchun har doim bir xil xabar
    const invalid = () => new UnauthorizedException('Telefon yoki kod noto\'g\'ri');
    if (!user || !this.isResettable(user)) throw invalid();

    await this.consumeTelegramCode(
      user.id,
      code,
      TelegramCodePurpose.password_reset,
      invalid,
    );

    // Kod to'g'ri chiqqach tashkilot holatini ham tekshiramiz — to'xtatilgan
    // firma xodimiga yangi parol yozishning ma'nosi yo'q
    await this.assertOrganizationActive(user);

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    // Yangilash tokenlarini o'chiramiz — sessiyalar endi uzaytirilmaydi.
    // Allaqachon berilgan kirish tokeni o'z muddati tugagunicha (JWT_EXPIRES_IN,
    // standart 15 daqiqa) amal qilishda davom etadi.
    await this.prisma.refreshToken.deleteMany({ where: { userId: user.id } });
    // Qolgan yuborilgan kodlar ishlatilmasin (urinish yozuvlariga tegmaymiz)
    await this.prisma.telegramLoginCode.updateMany({
      where: { userId: user.id, attempt: false, used: false },
      data: { used: true },
    });

    return { message: 'Parol yangilandi. Endi yangi parol bilan kiring.' };
  }

  /**
   * Parolni tiklash faqat parol bilan ishlaydigan faol xodimlar uchun.
   * Mijoz OTP bilan kiradi, platforma admin esa CRM dan foydalanmaydi.
   */
  private isResettable(user: {
    isActive: boolean;
    role: UserRole;
    passwordHash: string | null;
  }) {
    return (
      user.isActive &&
      Boolean(user.passwordHash) &&
      user.role !== UserRole.customer &&
      user.role !== UserRole.platform_admin
    );
  }

  async requestOtp(phone: string) {
    const normalized = this.normalizePhone(phone);
    await this.assertOtpCooldown(normalized);

    const code = process.env.SMS_PROVIDER === 'mock' ? '123456' : this.generateOtp();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await this.prisma.otpCode.create({
      data: { phone: normalized, code, expiresAt },
    });

    await this.notifications.sendSms(
      normalized,
      `CleanWay tasdiqlash kodi: ${code}`,
    );

    return {
      message: 'OTP yuborildi',
      ...(process.env.SMS_PROVIDER === 'mock' ? { devCode: code } : {}),
    };
  }

  async verifyOtp(phone: string, code: string, fullName?: string) {
    const normalized = this.normalizePhone(phone);
    const otp = await this.prisma.otpCode.findFirst({
      where: {
        phone: normalized,
        code,
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!otp) throw new BadRequestException('OTP noto\'g\'ri yoki muddati tugagan');

    await this.prisma.otpCode.update({ where: { id: otp.id }, data: { used: true } });

    let user = await this.prisma.user.findUnique({ where: { phone: normalized } });
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          phone: normalized,
          fullName: fullName ?? 'Mijoz',
          role: UserRole.customer,
          customerProfile: { create: {} },
        },
      });
    } else if (fullName && user.fullName === 'Mijoz') {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { fullName },
      });
    }

    return this.issueTokens(user);
  }

  async refresh(refreshToken: string) {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: { include: { userBranches: true } } },
    });
    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token yaroqsiz');
    }
    await this.prisma.refreshToken.delete({ where: { id: stored.id } });
    return this.issueTokens(stored.user);
  }

  async logout(refreshToken: string) {
    await this.prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
    return { message: 'Chiqildi' };
  }

  private async issueTokens(user: {
    id: string;
    role: UserRole;
    fullName: string;
    phone: string;
    organizationId: string | null;
    userBranches?: { branchId: string }[];
  }) {
    const branchIds = user.userBranches?.map((b) => b.branchId) ?? [];
    const payload = {
      sub: user.id,
      role: user.role,
      organizationId: user.organizationId ?? undefined,
      branchIds,
    };

    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.get('JWT_SECRET'),
      expiresIn: this.config.get('JWT_EXPIRES_IN', '15m'),
    });

    const refreshToken = randomUUID();
    const refreshExpires = this.config.get('JWT_REFRESH_EXPIRES_IN', '7d');
    const days = parseInt(refreshExpires) || 7;
    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + days * 86400000),
      },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        role: user.role,
        fullName: user.fullName,
        phone: user.phone,
        branchIds,
        organizationId: user.organizationId,
      },
    };
  }

  private async assertOrganizationActive(user: {
    role: UserRole;
    organizationId: string | null;
    organization?: {
      isActive: boolean;
      plan: OrganizationPlan;
      demoEndsAt: Date | null;
      id: string;
    } | null;
  }) {
    if (user.role === UserRole.platform_admin || user.role === UserRole.customer) return;
    if (!user.organization) {
      throw new UnauthorizedException('Tashkilot biriktirilmagan');
    }
    const org = user.organization;
    if (!org.isActive || org.plan === OrganizationPlan.suspended) {
      throw new UnauthorizedException('Tashkilot faol emas');
    }
    if (isDemoPeriodExpired(org) && org.plan === OrganizationPlan.demo) {
      await this.prisma.organization.update({
        where: { id: org.id },
        data: { plan: OrganizationPlan.expired },
      });
    }
  }

  /**
   * Bitta raqamga ketma-ket SMS yuborishni cheklaydi. IP bo'yicha throttler
   * yetarli emas: turli IP lardan bitta raqamni "bombardimon" qilish mumkin.
   */
  private async assertOtpCooldown(phone: string) {
    const last = await this.prisma.otpCode.findFirst({
      where: { phone },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });
    if (!last) return;

    const elapsed = Date.now() - last.createdAt.getTime();
    if (elapsed < OTP_COOLDOWN_MS) {
      const wait = Math.ceil((OTP_COOLDOWN_MS - elapsed) / 1000);
      throw new BadRequestException(
        `Yangi kod so'rash uchun ${wait} soniya kuting`,
      );
    }
  }

  private normalizePhone(phone: string) {
    const digits = phone.replace(/\D/g, '');
    if (digits.startsWith('998')) return `+${digits}`;
    if (digits.length === 9) return `+998${digits}`;
    return phone.startsWith('+') ? phone : `+${digits}`;
  }

  private generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}
