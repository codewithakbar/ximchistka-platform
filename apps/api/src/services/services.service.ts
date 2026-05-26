import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ServicesCatalogService {
  constructor(private prisma: PrismaService) {}

  listCategories() {
    return this.prisma.serviceCategory.findMany({
      where: { isActive: true },
      include: { services: { where: { isActive: true } } },
      orderBy: { sortOrder: 'asc' },
    });
  }

  listServices() {
    return this.prisma.service.findMany({
      where: { isActive: true },
      include: { category: true },
    });
  }

  getBranchPrices(branchId: string) {
    return this.prisma.priceRule.findMany({
      where: { branchId },
      include: { service: { include: { category: true } } },
    });
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
  }) {
    return this.prisma.service.create({ data });
  }

  upsertPriceRule(data: {
    branchId: string;
    serviceId: string;
    itemType?: string;
    price: number;
  }) {
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

  async updateService(id: string, data: Partial<{ name: string; basePrice: number; isActive: boolean }>) {
    await this.ensureService(id);
    return this.prisma.service.update({ where: { id }, data });
  }

  private async ensureService(id: string) {
    const s = await this.prisma.service.findUnique({ where: { id } });
    if (!s) throw new NotFoundException('Xizmat topilmadi');
    return s;
  }
}
