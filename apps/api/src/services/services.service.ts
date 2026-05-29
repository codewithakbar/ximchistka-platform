import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { applyServiceDiscount } from '@ximchistka/shared';
import { PrismaService } from '../prisma/prisma.service';
import { assertBranchAccessible, TenantUser } from '../branches/tenant-scope';

@Injectable()
export class ServicesCatalogService {
  constructor(private prisma: PrismaService) {}

  listCategories() {
    return this.prisma.serviceCategory.findMany({
      where: { isActive: true },
      include: { services: { where: { isActive: true }, orderBy: { name: 'asc' } } },
      orderBy: { sortOrder: 'asc' },
    });
  }

  listCategoriesForManage() {
    return this.prisma.serviceCategory.findMany({
      where: { isActive: true },
      include: { services: { orderBy: { name: 'asc' } } },
      orderBy: { sortOrder: 'asc' },
    });
  }

  listServices() {
    return this.prisma.service.findMany({
      where: { isActive: true },
      include: { category: true },
    });
  }

  async getBranchPrices(branchId: string) {
    const rules = await this.prisma.priceRule.findMany({
      where: { branchId },
      include: { service: { include: { category: true } } },
    });
    return rules.map((rule) => ({
      ...rule,
      listPrice: rule.price,
      effectivePrice: applyServiceDiscount(rule.price, rule.service),
    }));
  }

  createCategory(data: { name: string; description?: string; sortOrder?: number }) {
    return this.prisma.serviceCategory.create({ data });
  }

  createService(data: {
    categoryId: string;
    name: string;
    description?: string;
    basePrice: number;
    unit?: string;
    discountType?: string | null;
    discountValue?: number | null;
    discountValidUntil?: string | null;
  }) {
    const discount = this.normalizeDiscount(data);
    return this.prisma.service.create({
      data: {
        categoryId: data.categoryId,
        name: data.name,
        description: data.description,
        basePrice: data.basePrice,
        unit: data.unit,
        ...discount,
      },
    });
  }

  async upsertPriceRule(
    user: TenantUser,
    data: {
      branchId: string;
      serviceId: string;
      itemType?: string;
      price: number;
    },
  ) {
    await assertBranchAccessible(this.prisma, user, data.branchId);
    await this.ensureService(data.serviceId);

    return this.prisma.priceRule.upsert({
      where: {
        branchId_serviceId_itemType: {
          branchId: data.branchId,
          serviceId: data.serviceId,
          itemType: data.itemType ?? 'standart',
        },
      },
      update: { price: data.price },
      create: {
        branchId: data.branchId,
        serviceId: data.serviceId,
        itemType: data.itemType ?? 'standart',
        price: data.price,
      },
    });
  }

  async updateService(
    id: string,
    data: Partial<{
      name: string;
      description: string | null;
      unit: string;
      basePrice: number;
      isActive: boolean;
      discountType: string | null;
      discountValue: number | null;
      discountValidUntil: string | null;
    }>,
  ) {
    await this.ensureService(id);
    const { discountType, discountValue, discountValidUntil, ...rest } = data;
    const updateData: Record<string, unknown> = { ...rest };
    if (
      discountType !== undefined ||
      discountValue !== undefined ||
      discountValidUntil !== undefined
    ) {
      Object.assign(
        updateData,
        this.normalizeDiscount({ discountType, discountValue, discountValidUntil }),
      );
    }
    return this.prisma.service.update({ where: { id }, data: updateData });
  }

  private normalizeDiscount(data: {
    discountType?: string | null;
    discountValue?: number | null;
    discountValidUntil?: string | null;
  }) {
    if (!data.discountType) {
      return {
        discountType: null,
        discountValue: null,
        discountValidUntil: null,
      };
    }
    if (data.discountType !== 'percent' && data.discountType !== 'fixed') {
      throw new BadRequestException('Chegirma turi percent yoki fixed bo\'lishi kerak');
    }
    const value = data.discountValue;
    if (value == null || value <= 0) {
      throw new BadRequestException('Chegirma qiymati kiritilishi shart');
    }
    if (data.discountType === 'percent' && value > 100) {
      throw new BadRequestException('Foiz chegirma 100 dan oshmasligi kerak');
    }
    return {
      discountType: data.discountType,
      discountValue: value,
      discountValidUntil: data.discountValidUntil
        ? new Date(data.discountValidUntil)
        : null,
    };
  }

  async updateCategory(
    id: string,
    data: Partial<{
      name: string;
      description: string | null;
      sortOrder: number;
      isActive: boolean;
    }>,
  ) {
    await this.ensureCategory(id);
    return this.prisma.serviceCategory.update({ where: { id }, data });
  }

  private async ensureCategory(id: string) {
    const c = await this.prisma.serviceCategory.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('Kategoriya topilmadi');
    return c;
  }

  private async ensureService(id: string) {
    const s = await this.prisma.service.findUnique({ where: { id } });
    if (!s) throw new NotFoundException('Xizmat topilmadi');
    return s;
  }
}
