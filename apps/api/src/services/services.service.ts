import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { applyServiceDiscount } from '@ximchistka/shared';
import { PrismaService } from '../prisma/prisma.service';
import { assertBranchAccessible, TenantUser } from '../branches/tenant-scope';

@Injectable()
export class ServicesCatalogService {
  constructor(private prisma: PrismaService) {}

  private requireOrganizationId(user: TenantUser) {
    if (!user.organizationId) {
      throw new ForbiddenException('Tashkilot topilmadi');
    }
    return user.organizationId;
  }

  listCategories(user: TenantUser) {
    const organizationId = this.requireOrganizationId(user);
    return this.prisma.serviceCategory.findMany({
      where: { organizationId, isActive: true },
      include: {
        services: {
          where: { isActive: true },
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  listCategoriesForManage(user: TenantUser) {
    const organizationId = this.requireOrganizationId(user);
    return this.prisma.serviceCategory.findMany({
      where: { organizationId },
      include: { services: { orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] } },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  listServices(user: TenantUser) {
    const organizationId = this.requireOrganizationId(user);
    return this.prisma.service.findMany({
      where: { isActive: true, category: { organizationId } },
      include: { category: true },
    });
  }

  async getBranchPrices(
    branchId: string,
    opts: { includeCustom: boolean } = { includeCustom: false },
  ) {
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
      select: { organizationId: true },
    });
    if (!branch) throw new NotFoundException('Filial topilmadi');

    const [rules, services] = await Promise.all([
      this.prisma.priceRule.findMany({
        where: {
          branchId,
          service: { category: { organizationId: branch.organizationId } },
        },
        include: { service: { include: { category: true } } },
      }),
      this.prisma.service.findMany({
        where: {
          isActive: true,
          category: { organizationId: branch.organizationId, isActive: true },
        },
        include: { category: true },
        orderBy: [
          { category: { sortOrder: 'asc' } },
          { category: { name: 'asc' } },
          { sortOrder: 'asc' },
          { name: 'asc' },
        ],
      }),
    ]);

    const ruleByServiceId = new Map(rules.map((rule) => [rule.serviceId, rule]));

    const visible = opts.includeCustom
      ? services
      : services.filter((service) => !service.isCustom);

    // Qoida topilmasa basePrice ishlatiladi — bu o'qish yo'li DB ga yozmaydi
    // (endpoint ommaviy: mijoz veb/mobil narxlarni auth siz ko'radi).
    return visible.map((service) => {
      const rule = ruleByServiceId.get(service.id);
      const listPrice = rule?.price ?? service.basePrice;
      const pricedService = rule?.service ?? service;
      return {
        serviceId: service.id,
        branchId,
        price: listPrice,
        listPrice,
        effectivePrice: applyServiceDiscount(listPrice, pricedService),
        itemType: rule?.itemType ?? 'standart',
        isCustom: service.isCustom,
        sortOrder: service.sortOrder,
        categorySortOrder: service.category.sortOrder,
        service: {
          id: service.id,
          name: service.name,
          unit: service.unit,
          isCustom: service.isCustom,
          sortOrder: service.sortOrder,
          categoryId: service.categoryId,
          categoryName: service.category.name,
          categorySortOrder: service.category.sortOrder,
        },
      };
    });
  }

  async createCategory(
    user: TenantUser,
    data: { name: string; description?: string; sortOrder?: number },
  ) {
    const organizationId = this.requireOrganizationId(user);
    let sortOrder = data.sortOrder;
    if (sortOrder === undefined) {
      const last = await this.prisma.serviceCategory.aggregate({
        where: { organizationId },
        _max: { sortOrder: true },
      });
      sortOrder = (last._max.sortOrder ?? -1) + 1;
    }
    return this.prisma.serviceCategory.create({
      data: { ...data, sortOrder, organizationId },
    });
  }

  /** Kategoriyalarni berilgan ketma-ketlikda qayta tartiblaydi */
  async reorderCategories(user: TenantUser, orderedIds: string[]) {
    const organizationId = this.requireOrganizationId(user);
    const owned = await this.prisma.serviceCategory.findMany({
      where: { organizationId },
      select: { id: true },
    });
    const ownedSet = new Set(owned.map((c) => c.id));
    const ids = orderedIds.filter((id) => ownedSet.has(id));
    await this.prisma.$transaction(
      ids.map((id, index) =>
        this.prisma.serviceCategory.update({
          where: { id },
          data: { sortOrder: index },
        }),
      ),
    );
    return { reordered: ids.length };
  }

  /** Bitta kategoriya ichidagi xizmatlarni qayta tartiblaydi */
  async reorderServices(user: TenantUser, categoryId: string, orderedIds: string[]) {
    const organizationId = this.requireOrganizationId(user);
    await this.ensureCategoryInOrg(categoryId, organizationId);
    const owned = await this.prisma.service.findMany({
      where: { categoryId },
      select: { id: true },
    });
    const ownedSet = new Set(owned.map((svc) => svc.id));
    const ids = orderedIds.filter((id) => ownedSet.has(id));
    await this.prisma.$transaction(
      ids.map((id, index) =>
        this.prisma.service.update({
          where: { id },
          data: { sortOrder: index },
        }),
      ),
    );
    return { reordered: ids.length };
  }

  async createService(
    user: TenantUser,
    data: {
      categoryId: string;
      name: string;
      description?: string;
      basePrice: number;
      unit?: string;
      isCustom?: boolean;
      discountType?: string | null;
      discountValue?: number | null;
      discountValidUntil?: string | null;
    },
  ) {
    const organizationId = this.requireOrganizationId(user);
    await this.ensureCategoryInOrg(data.categoryId, organizationId);
    const discount = this.normalizeDiscount(data);
    const last = await this.prisma.service.aggregate({
      where: { categoryId: data.categoryId },
      _max: { sortOrder: true },
    });
    const service = await this.prisma.service.create({
      data: {
        categoryId: data.categoryId,
        name: data.name,
        description: data.description,
        basePrice: data.basePrice,
        unit: data.unit,
        isCustom: data.isCustom ?? false,
        sortOrder: (last._max.sortOrder ?? -1) + 1,
        ...discount,
      },
    });

    const branches = await this.prisma.branch.findMany({
      where: { organizationId, isActive: true },
      select: { id: true },
    });
    if (branches.length > 0) {
      await this.prisma.priceRule.createMany({
        data: branches.map((branch) => ({
          branchId: branch.id,
          serviceId: service.id,
          itemType: 'standart',
          price: service.basePrice,
        })),
        skipDuplicates: true,
      });
    }

    return service;
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
    const organizationId = this.requireOrganizationId(user);
    await this.ensureServiceInOrg(data.serviceId, organizationId);

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
    user: TenantUser,
    id: string,
    data: Partial<{
      name: string;
      description: string | null;
      unit: string;
      basePrice: number;
      isActive: boolean;
      isCustom: boolean;
      discountType: string | null;
      discountValue: number | null;
      discountValidUntil: string | null;
    }>,
  ) {
    const organizationId = this.requireOrganizationId(user);
    await this.ensureServiceInOrg(id, organizationId);
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

  async updateCategory(
    user: TenantUser,
    id: string,
    data: Partial<{
      name: string;
      description: string | null;
      sortOrder: number;
      isActive: boolean;
    }>,
  ) {
    const organizationId = this.requireOrganizationId(user);
    await this.ensureCategoryInOrg(id, organizationId);
    return this.prisma.serviceCategory.update({ where: { id }, data });
  }

  async deleteService(user: TenantUser, id: string) {
    const organizationId = this.requireOrganizationId(user);
    await this.ensureServiceInOrg(id, organizationId);

    const orderCount = await this.prisma.orderItem.count({ where: { serviceId: id } });
    if (orderCount > 0) {
      throw new BadRequestException(
        'Bu xizmat buyurtmalarda ishlatilgan — o\'chirish mumkin emas. Faolsizlantiring.',
      );
    }

    await this.prisma.$transaction([
      this.prisma.priceRule.deleteMany({ where: { serviceId: id } }),
      this.prisma.service.delete({ where: { id } }),
    ]);

    return { deleted: true };
  }

  async deleteCategory(user: TenantUser, id: string) {
    const organizationId = this.requireOrganizationId(user);
    const category = await this.ensureCategoryInOrg(id, organizationId);

    const services = await this.prisma.service.findMany({
      where: { categoryId: id },
      select: { id: true, _count: { select: { orderItems: true } } },
    });

    const blocked = services.some((s) => s._count.orderItems > 0);
    if (blocked) {
      throw new BadRequestException(
        'Kategoriyadagi ba\'zi xizmatlar buyurtmalarda ishlatilgan — o\'chirish mumkin emas.',
      );
    }

    const serviceIds = services.map((s) => s.id);
    await this.prisma.$transaction([
      this.prisma.priceRule.deleteMany({ where: { serviceId: { in: serviceIds } } }),
      this.prisma.service.deleteMany({ where: { categoryId: id } }),
      this.prisma.serviceCategory.delete({ where: { id: category.id } }),
    ]);

    return { deleted: true };
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

  private async ensureCategoryInOrg(id: string, organizationId: string) {
    const c = await this.prisma.serviceCategory.findFirst({
      where: { id, organizationId },
    });
    if (!c) throw new NotFoundException('Kategoriya topilmadi');
    return c;
  }

  private async ensureServiceInOrg(id: string, organizationId: string) {
    const s = await this.prisma.service.findFirst({
      where: { id, category: { organizationId } },
    });
    if (!s) throw new NotFoundException('Xizmat topilmadi');
    return s;
  }
}
