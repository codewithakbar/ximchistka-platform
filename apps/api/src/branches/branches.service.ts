import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  assertBranchAccessible,
  branchScopeForUser,
  orderScopeForUser,
  TenantUser,
} from './tenant-scope';

@Injectable()
export class BranchesService {
  constructor(private prisma: PrismaService) {}

  orderScopeForUser(user: TenantUser) {
    return orderScopeForUser(user);
  }

  branchScopeForUser(user: TenantUser) {
    return branchScopeForUser(user);
  }

  async findAll(user?: TenantUser, organizationSlug?: string) {
    if (user && user.role !== UserRole.customer) {
      return this.prisma.branch.findMany({
        where: branchScopeForUser(user),
        orderBy: { name: 'asc' },
      });
    }

    if (organizationSlug) {
      const org = await this.prisma.organization.findFirst({
        where: { slug: organizationSlug, isActive: true },
      });
      if (!org) return [];
      return this.prisma.branch.findMany({
        where: { organizationId: org.id, isActive: true },
        orderBy: { name: 'asc' },
      });
    }

    return [];
  }

  async findOne(id: string, user?: TenantUser) {
    const branch = await this.prisma.branch.findUnique({ where: { id } });
    if (!branch) throw new NotFoundException('Filial topilmadi');

    if (user && user.role !== UserRole.customer && user.role !== UserRole.platform_admin) {
      await assertBranchAccessible(this.prisma, user, id);
    }

    return branch;
  }

  async create(data: {
    organizationId: string;
    name: string;
    address: string;
    phone: string;
    latitude?: number;
    longitude?: number;
    openTime?: string;
    closeTime?: string;
  }) {
    const branch = await this.prisma.branch.create({
      data: {
        ...data,
        openTime: data.openTime ?? '09:00',
        closeTime: data.closeTime ?? '20:00',
      },
    });

    const services = await this.prisma.service.findMany({
      where: {
        isActive: true,
        category: { organizationId: data.organizationId },
      },
      select: { id: true, basePrice: true },
    });
    if (services.length > 0) {
      await this.prisma.priceRule.createMany({
        data: services.map((s) => ({
          branchId: branch.id,
          serviceId: s.id,
          itemType: 'standart',
          price: s.basePrice,
        })),
        skipDuplicates: true,
      });
    }

    return branch;
  }

  async update(id: string, data: Partial<{
    name: string;
    address: string;
    phone: string;
    latitude: number;
    longitude: number;
    openTime: string;
    closeTime: string;
    isActive: boolean;
  }>) {
    await this.ensureExists(id);
    return this.prisma.branch.update({ where: { id }, data });
  }

  async updateForUser(
    user: TenantUser,
    id: string,
    data: Partial<{
      name: string;
      address: string;
      phone: string;
      latitude: number;
      longitude: number;
      openTime: string;
      closeTime: string;
      isActive: boolean;
    }>,
  ) {
    await this.assertBranchAccess(user, id);
    const patch = { ...data };
    if (user.role !== UserRole.super_admin) {
      delete patch.isActive;
    }
    return this.update(id, patch);
  }

  private async ensureExists(id: string) {
    const branch = await this.prisma.branch.findUnique({ where: { id } });
    if (!branch) throw new NotFoundException('Filial topilmadi');
    return branch;
  }

  async assertBranchAccess(user: TenantUser, branchId: string) {
    await assertBranchAccessible(this.prisma, user, branchId);
  }

  async remove(user: TenantUser, branchId: string) {
    if (user.role !== UserRole.super_admin) {
      throw new BadRequestException('Faqat super admin filialni o\'chira oladi');
    }

    const branch = await this.ensureExists(branchId);
    await assertBranchAccessible(this.prisma, user, branchId);

    const [orderCount, branchCount] = await Promise.all([
      this.prisma.order.count({ where: { branchId } }),
      this.prisma.branch.count({
        where: { organizationId: branch.organizationId, isActive: true },
      }),
    ]);

    if (orderCount > 0) {
      throw new BadRequestException(
        'Bu filialda buyurtmalar bor. O\'chirish mumkin emas — filialni nofaol qiling.',
      );
    }

    if (branchCount <= 1) {
      throw new BadRequestException('Tashkilotda kamida bitta filial qolishi kerak');
    }

    await this.prisma.branch.delete({ where: { id: branchId } });
    return { message: 'Filial o\'chirildi', id: branchId };
  }

  async assertOrganizationAccess(user: TenantUser, organizationId: string) {
    if (user.role === UserRole.platform_admin) return;
    if (user.organizationId !== organizationId) {
      throw new ForbiddenException('Bu tashkilotga ruxsat yo\'q');
    }
  }
}
