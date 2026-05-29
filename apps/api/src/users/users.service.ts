import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  listStaff(organizationId?: string) {
    return this.prisma.user.findMany({
      where: {
        role: { not: UserRole.customer },
        ...(organizationId ? { organizationId } : {}),
      },
      select: {
        id: true,
        fullName: true,
        phone: true,
        email: true,
        role: true,
        avatarUrl: true,
        isActive: true,
        createdAt: true,
        userBranches: { include: { branch: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private normalizePhone(phone: string) {
    const digits = phone.replace(/\D/g, '');
    if (digits.startsWith('998')) return `+${digits}`;
    if (digits.length === 9) return `+998${digits}`;
    return phone.startsWith('+') ? phone : `+${digits}`;
  }

  async createStaff(data: {
    organizationId: string;
    phone: string;
    email?: string;
    fullName: string;
    role: UserRole;
    password: string;
    branchIds?: string[];
    avatarUrl?: string;
  }) {
    if (data.role === UserRole.super_admin || data.role === UserRole.customer) {
      throw new BadRequestException('Bu rol yaratib bo\'lmaydi');
    }

    const phone = this.normalizePhone(data.phone);
    const existing = await this.prisma.user.findUnique({ where: { phone } });
    if (existing) throw new BadRequestException('Bu telefon allaqachon ro\'yxatdan o\'tgan');

    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await this.prisma.user.create({
      data: {
        organizationId: data.organizationId,
        phone,
        email: data.email,
        fullName: data.fullName.trim(),
        avatarUrl: data.avatarUrl,
        role: data.role,
        passwordHash,
        isActive: true,
      },
    });

    if (data.branchIds?.length) {
      await this.prisma.userBranch.createMany({
        data: data.branchIds.map((branchId) => ({ userId: user.id, branchId })),
        skipDuplicates: true,
      });
    }

    return this.prisma.user.findUnique({
      where: { id: user.id },
      include: { userBranches: { include: { branch: true } } },
    });
  }

  async updateStaffBranches(
    organizationId: string,
    staffId: string,
    branchIds: string[],
  ) {
    const user = await this.prisma.user.findFirst({
      where: { id: staffId, organizationId },
      include: { userBranches: true },
    });
    if (!user) throw new NotFoundException('Xodim topilmadi');
    if (user.role === UserRole.super_admin || user.role === UserRole.customer) {
      throw new BadRequestException('Bu xodimning filiallarini o\'zgartirib bo\'lmaydi');
    }

    const uniqueBranchIds = [...new Set(branchIds)];
    if (uniqueBranchIds.length === 0) {
      throw new BadRequestException('Kamida bitta filial tanlang');
    }

    const branches = await this.prisma.branch.findMany({
      where: { id: { in: uniqueBranchIds }, organizationId },
    });
    if (branches.length !== uniqueBranchIds.length) {
      throw new BadRequestException('Tanlangan filiallardan biri noto\'g\'ri');
    }

    await this.prisma.$transaction([
      this.prisma.userBranch.deleteMany({ where: { userId: staffId } }),
      this.prisma.userBranch.createMany({
        data: uniqueBranchIds.map((branchId) => ({ userId: staffId, branchId })),
      }),
    ]);

    return this.prisma.user.findUnique({
      where: { id: staffId },
      include: { userBranches: { include: { branch: true } } },
    });
  }

  async updateStaffProfile(
    organizationId: string,
    staffId: string,
    data: { fullName?: string; avatarUrl?: string | null },
  ) {
    const user = await this.prisma.user.findFirst({
      where: { id: staffId, organizationId },
    });
    if (!user) throw new NotFoundException('Xodim topilmadi');

    await this.prisma.user.update({
      where: { id: staffId },
      data: {
        ...(data.fullName !== undefined ? { fullName: data.fullName.trim() } : {}),
        ...(data.avatarUrl !== undefined ? { avatarUrl: data.avatarUrl } : {}),
      },
    });

    return this.prisma.user.findUnique({
      where: { id: staffId },
      select: {
        id: true,
        fullName: true,
        phone: true,
        email: true,
        role: true,
        avatarUrl: true,
        isActive: true,
        createdAt: true,
        userBranches: { include: { branch: true } },
      },
    });
  }
}
