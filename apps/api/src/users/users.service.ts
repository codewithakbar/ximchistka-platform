import { BadRequestException, Injectable } from '@nestjs/common';
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
      include: { userBranches: { include: { branch: true } } },
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
}
