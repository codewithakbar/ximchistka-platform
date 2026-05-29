import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

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
    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      branchCount: org._count.branches,
      userCount: org._count.users,
      createdAt: org.createdAt,
    };
  }

  async updateOrganization(
    organizationId: string | null | undefined,
    data: { name?: string; slug?: string },
  ) {
    if (!organizationId) throw new ForbiddenException('Tashkilot yo\'q');
    if (data.slug) {
      const taken = await this.prisma.organization.findFirst({
        where: { slug: data.slug, id: { not: organizationId } },
      });
      if (taken) throw new BadRequestException('Bu slug band');
    }
    const org = await this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        ...(data.name ? { name: data.name.trim() } : {}),
        ...(data.slug ? { slug: data.slug.trim().toLowerCase() } : {}),
      },
      include: { _count: { select: { branches: true, users: true } } },
    });
    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
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
