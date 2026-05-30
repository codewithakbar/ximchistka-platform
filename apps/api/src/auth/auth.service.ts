import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { OrganizationPlan, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private notifications: NotificationsService,
  ) {}

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

  async requestOtp(phone: string) {
    const normalized = this.normalizePhone(phone);
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
    if (
      (org.plan === OrganizationPlan.demo || org.plan === OrganizationPlan.expired) &&
      org.demoEndsAt &&
      org.demoEndsAt < new Date()
    ) {
      if (org.plan === OrganizationPlan.demo) {
        await this.prisma.organization.update({
          where: { id: org.id },
          data: { plan: OrganizationPlan.expired },
        });
      }
      throw new UnauthorizedException('Demo muddati tugagan. Platforma admin bilan bog\'laning.');
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
