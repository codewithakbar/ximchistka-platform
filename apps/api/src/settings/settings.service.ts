import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { Prisma, UserRole } from '@prisma/client';
import { normalizeReceiptSettings, type ReceiptSettings } from '@ximchistka/shared';
import { PrismaService } from '../prisma/prisma.service';
import { isDemoPeriodExpired } from '../auth/demo-expiry';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        organization: true,
        userBranches: { include: { branch: true } },
      },
    });
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      avatarUrl: user.avatarUrl,
      organizationId: user.organizationId,
      organization: user.organization
        ? {
            id: user.organization.id,
            name: user.organization.name,
            slug: user.organization.slug,
            plan: user.organization.plan,
            demoEndsAt: user.organization.demoEndsAt,
            demoExpired: isDemoPeriodExpired(user.organization),
            orderItemColors: user.organization.orderItemColors ?? [],
            receiptSettings: normalizeReceiptSettings(user.organization.receiptSettings),
          }
        : null,
      branches: user.userBranches.map((ub) => ({
        id: ub.branch.id,
        name: ub.branch.name,
      })),
      createdAt: user.createdAt,
    };
  }

  async updateProfile(
    userId: string,
    data: { fullName?: string; email?: string; avatarUrl?: string | null },
  ) {
    if (
      !data.fullName?.trim() &&
      data.email === undefined &&
      data.avatarUrl === undefined
    ) {
      throw new BadRequestException('Yangilash uchun ma\'lumot kiriting');
    }
    if (data.email) {
      const existing = await this.prisma.user.findFirst({
        where: { email: data.email, id: { not: userId } },
      });
      if (existing) throw new BadRequestException('Bu email allaqachon band');
    }
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.fullName ? { fullName: data.fullName.trim() } : {}),
        ...(data.email !== undefined ? { email: data.email || null } : {}),
        ...(data.avatarUrl !== undefined ? { avatarUrl: data.avatarUrl } : {}),
      },
      include: { organization: true },
    });
    return this.getProfile(user.id);
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.passwordHash) {
      throw new BadRequestException('Parol o\'rnatilmagan');
    }
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new BadRequestException('Joriy parol noto\'g\'ri');

    if (newPassword.length < 6) {
      throw new BadRequestException('Yangi parol kamida 6 belgidan iborat bo\'lishi kerak');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
    await this.prisma.refreshToken.deleteMany({ where: { userId } });
    return { message: 'Parol yangilandi. Qayta kiring.' };
  }

  async getOrganization(organizationId: string | null | undefined) {
    if (!organizationId) throw new NotFoundException('Tashkilot topilmadi');
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        _count: { select: { branches: true, users: true } },
      },
    });
    if (!org) throw new NotFoundException('Tashkilot topilmadi');
    return this.mapOrganization(org);
  }

  async updateOrganization(
    organizationId: string | null | undefined,
    data: {
      name?: string;
      slug?: string;
      orderNumberPrefix?: string;
      orderNumberNext?: number;
      orderItemColors?: string[];
      receiptSettings?: Record<string, unknown>;
    },
  ) {
    if (!organizationId) throw new ForbiddenException('Tashkilot yo\'q');
    if (data.slug) {
      const taken = await this.prisma.organization.findFirst({
        where: { slug: data.slug, id: { not: organizationId } },
      });
      if (taken) throw new BadRequestException('Bu slug band');
    }

    let orderNumberPrefix: string | undefined;
    if (data.orderNumberPrefix !== undefined) {
      orderNumberPrefix = this.normalizeOrderPrefix(data.orderNumberPrefix);
    }

    let orderNumberNext: number | undefined;
    if (data.orderNumberNext !== undefined) {
      const n = Math.floor(Number(data.orderNumberNext));
      if (!Number.isFinite(n) || n < 1 || n > 99999999) {
        throw new BadRequestException('Keyingi chek raqami 1 dan 99999999 gacha bo\'lishi kerak');
      }
      orderNumberNext = n;
    }

    let orderItemColors: string[] | undefined;
    if (data.orderItemColors !== undefined) {
      orderItemColors = this.normalizeOrderItemColors(data.orderItemColors);
    }

    let receiptSettings: ReceiptSettings | undefined;
    if (data.receiptSettings !== undefined) {
      receiptSettings = normalizeReceiptSettings(data.receiptSettings);
    }

    const org = await this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        ...(data.name ? { name: data.name.trim() } : {}),
        ...(data.slug ? { slug: data.slug.trim().toLowerCase() } : {}),
        ...(orderNumberPrefix !== undefined ? { orderNumberPrefix } : {}),
        ...(orderNumberNext !== undefined ? { orderNumberNext } : {}),
        ...(orderItemColors !== undefined ? { orderItemColors } : {}),
        ...(receiptSettings !== undefined
          ? { receiptSettings: receiptSettings as unknown as Prisma.InputJsonValue }
          : {}),
      },
      include: { _count: { select: { branches: true, users: true } } },
    });
    return this.mapOrganization(org);
  }

  private normalizeOrderPrefix(prefix: string) {
    const cleaned = prefix
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 8);
    if (!cleaned) {
      throw new BadRequestException('Chek prefiksi kamida 1 ta harf yoki raqam bo\'lishi kerak');
    }
    return cleaned;
  }

  private normalizeOrderItemColors(colors: string[]) {
    if (!Array.isArray(colors)) {
      throw new BadRequestException('Ranglar ro\'yxati noto\'g\'ri');
    }
    const seen = new Set<string>();
    const result: string[] = [];
    for (const raw of colors) {
      const label = String(raw).trim().slice(0, 40);
      if (!label) continue;
      const key = label.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(label);
      if (result.length >= 30) break;
    }
    return result;
  }

  private formatOrderNumberPreview(prefix: string, sequence: number) {
    const pad = Math.max(4, String(sequence).length);
    return `${prefix}-${String(sequence).padStart(pad, '0')}`;
  }

  private mapOrganization(org: {
    id: string;
    name: string;
    slug: string;
    orderNumberPrefix: string;
    orderNumberNext: number;
    orderItemColors: string[];
    receiptSettings?: unknown;
    createdAt: Date;
    _count: { branches: number; users: number };
  }) {
    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      orderNumberPrefix: org.orderNumberPrefix,
      orderNumberNext: org.orderNumberNext,
      orderItemColors: org.orderItemColors ?? [],
      receiptSettings: normalizeReceiptSettings(org.receiptSettings),
      orderNumberPreview: this.formatOrderNumberPreview(
        org.orderNumberPrefix,
        org.orderNumberNext,
      ),
      branchCount: org._count.branches,
      userCount: org._count.users,
      createdAt: org.createdAt,
    };
  }

  getSystemInfo() {
    return {
      smsProvider: process.env.SMS_PROVIDER ?? 'mock',
      apiVersion: 'v1',
      environment: process.env.NODE_ENV ?? 'development',
    };
  }
}
