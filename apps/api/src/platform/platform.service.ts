import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrganizationPlan, OrderStatus, Prisma, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

const DEMO_DAYS = 14;
const PUBLIC_TRIAL_DAYS = 14;

type BranchWithCount = {
  id: string;
  name: string;
  address: string;
  phone: string;
  isActive: boolean;
  _count?: { orders: number; userBranches: number };
};

type StaffUser = {
  id: string;
  fullName: string;
  phone: string;
  email?: string | null;
  role: UserRole;
  isActive: boolean;
  createdAt?: Date;
  userBranches?: { branch: { id: string; name: string } }[];
};

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
}

@Injectable()
export class PlatformService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  async listOrganizations() {
    const orgs = await this.prisma.organization.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { branches: true, users: true } },
        branches: { take: 1, orderBy: { createdAt: 'asc' } },
      },
    });

    const now = new Date();
    return orgs.map((o) => this.mapOrganization(o, now));
  }

  async getOrganization(id: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        _count: { select: { branches: true, users: true } },
        branches: {
          orderBy: { name: 'asc' },
          include: { _count: { select: { orders: true, userBranches: true } } },
        },
        users: {
          where: { role: { not: UserRole.customer } },
          orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
          select: {
            id: true,
            fullName: true,
            phone: true,
            email: true,
            role: true,
            isActive: true,
            createdAt: true,
            userBranches: {
              select: { branch: { select: { id: true, name: true } } },
            },
          },
        },
      },
    });
    if (!org) throw new NotFoundException('Tashkilot topilmadi');

    const branchIds = org.branches.map((b) => b.id);
    const [statusGroups, orderStats, customerCount, categories] = await Promise.all([
      this.prisma.order.groupBy({
        by: ['status'],
        where: { branchId: { in: branchIds } },
        _count: { _all: true },
      }),
      this.prisma.order.aggregate({
        where: { branchId: { in: branchIds } },
        _sum: { totalAmount: true },
        _count: { _all: true },
      }),
      this.prisma.user.count({
        where: { organizationId: id, role: UserRole.customer },
      }),
      this.prisma.serviceCategory.findMany({
        where: { organizationId: id },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        include: {
          services: {
            orderBy: { name: 'asc' },
            select: {
              id: true,
              name: true,
              description: true,
              unit: true,
              basePrice: true,
              discountType: true,
              discountValue: true,
              discountValidUntil: true,
              isActive: true,
            },
          },
        },
      }),
    ]);

    const ordersByStatus = statusGroups.reduce<Record<string, number>>((acc, g) => {
      acc[g.status] = g._count._all;
      return acc;
    }, {});

    const mapped = this.mapOrganization(org, new Date(), true);
    const serviceCount = categories.reduce((sum, c) => sum + c.services.length, 0);
    return {
      ...mapped,
      catalog: {
        categoryCount: categories.length,
        serviceCount,
        categories: categories.map((c) => ({
          id: c.id,
          name: c.name,
          description: c.description,
          isActive: c.isActive,
          sortOrder: c.sortOrder,
          services: c.services.map((s) => ({
            id: s.id,
            name: s.name,
            description: s.description,
            unit: s.unit,
            basePrice: s.basePrice,
            discountType: s.discountType,
            discountValue: s.discountValue,
            discountValidUntil: s.discountValidUntil?.toISOString() ?? null,
            isActive: s.isActive,
          })),
        })),
      },
      stats: {
        totalOrders: orderStats._count._all,
        totalRevenue: orderStats._sum.totalAmount ?? 0,
        customerCount,
        staffCount: org.users.length,
        ordersByStatus,
        categoryCount: categories.length,
        serviceCount,
      },
    };
  }

  private async getOrgBranchIds(orgId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { branches: { select: { id: true } } },
    });
    if (!org) throw new NotFoundException('Tashkilot topilmadi');
    return org.branches.map((b) => b.id);
  }

  async listOrganizationOrders(
    orgId: string,
    query: { status?: OrderStatus; page?: number; limit?: number },
  ) {
    const branchIds = await this.getOrgBranchIds(orgId);
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(Math.max(1, query.limit ?? 20), 50);

    const where: Prisma.OrderWhereInput = {
      branchId: { in: branchIds.length ? branchIds : ['__none__'] },
      ...(query.status ? { status: query.status } : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          branch: { select: { id: true, name: true } },
          customer: { include: { user: { select: { fullName: true, phone: true } } } },
          statusHistory: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data: rows.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        totalAmount: o.totalAmount,
        createdAt: o.createdAt.toISOString(),
        updatedAt: o.updatedAt.toISOString(),
        branch: o.branch,
        customer: {
          fullName: o.customer.user.fullName,
          phone: o.customer.user.phone,
        },
        lastStatusAt: o.statusHistory[0]?.createdAt.toISOString() ?? o.createdAt.toISOString(),
      })),
      total,
      page,
      limit,
    };
  }

  async getOrganizationOrder(orgId: string, orderId: string) {
    const branchIds = await this.getOrgBranchIds(orgId);

    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        branchId: { in: branchIds },
      },
      include: {
        branch: { select: { id: true, name: true, address: true, phone: true } },
        customer: {
          include: {
            user: { select: { fullName: true, phone: true, email: true } },
          },
        },
        items: { include: { service: { select: { name: true, unit: true } } } },
        pickupDelivery: {
          include: {
            courier: { select: { id: true, fullName: true, phone: true } },
          },
        },
        statusHistory: {
          include: { user: { select: { id: true, fullName: true, role: true } } },
          orderBy: { createdAt: 'asc' },
        },
        payments: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!order) throw new NotFoundException('Buyurtma topilmadi');

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      totalAmount: order.totalAmount,
      discountAmount: order.discountAmount,
      notes: order.notes,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      estimatedReady: order.estimatedReady?.toISOString() ?? null,
      branch: order.branch,
      customer: {
        fullName: order.customer.user.fullName,
        phone: order.customer.user.phone,
        email: order.customer.user.email,
      },
      items: order.items.map((i) => ({
        id: i.id,
        serviceName: i.service.name,
        unit: i.service.unit,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        itemType: i.itemType,
      })),
      pickupDelivery: order.pickupDelivery
        ? {
            type: order.pickupDelivery.type,
            address: order.pickupDelivery.address,
            scheduledAt: order.pickupDelivery.scheduledAt?.toISOString() ?? null,
            completedAt: order.pickupDelivery.completedAt?.toISOString() ?? null,
            courier: order.pickupDelivery.courier
              ? {
                  fullName: order.pickupDelivery.courier.fullName,
                  phone: order.pickupDelivery.courier.phone,
                }
              : null,
          }
        : null,
      statusHistory: order.statusHistory.map((h) => ({
        id: h.id,
        status: h.status,
        note: h.note,
        createdAt: h.createdAt.toISOString(),
        changedBy: h.user
          ? { fullName: h.user.fullName, role: h.user.role }
          : null,
      })),
      payments: order.payments.map((p) => ({
        id: p.id,
        amount: p.amount,
        provider: p.provider,
        status: p.status,
        createdAt: p.createdAt.toISOString(),
      })),
    };
  }

  async createOrganization(data: {
    name: string;
    slug?: string;
    contactPhone?: string;
    contactEmail?: string;
    demoDays?: number;
    branchName: string;
    branchAddress: string;
    branchPhone: string;
    adminFullName: string;
    adminPhone: string;
    adminPassword: string;
  }) {
    const adminPhone = this.normalizePhone(data.adminPhone);
    const slug = data.slug?.trim()
      ? await this.assertSlugAvailable(data.slug.trim())
      : await this.resolveSlug(data.name);

    const phoneTaken = await this.prisma.user.findUnique({ where: { phone: adminPhone } });
    if (phoneTaken) throw new BadRequestException('Admin telefoni band');

    const demoDays = data.demoDays ?? DEMO_DAYS;
    const demoStartedAt = new Date();
    const demoEndsAt = new Date(Date.now() + demoDays * 86400000);
    const passwordHash = await bcrypt.hash(data.adminPassword, 10);

    const result = await this.prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: data.name,
          slug,
          plan: OrganizationPlan.demo,
          demoStartedAt,
          demoEndsAt,
          contactPhone: data.contactPhone ? this.normalizePhone(data.contactPhone) : undefined,
          contactEmail: data.contactEmail,
        },
      });

      const branch = await tx.branch.create({
        data: {
          organizationId: org.id,
          name: data.branchName,
          address: data.branchAddress,
          phone: this.normalizePhone(data.branchPhone),
        },
      });

      const admin = await tx.user.create({
        data: {
          organizationId: org.id,
          phone: adminPhone,
          fullName: data.adminFullName,
          role: UserRole.super_admin,
          passwordHash,
          userBranches: { create: { branchId: branch.id } },
        },
      });

      return { org, branch, admin };
    });

    return {
      organization: this.mapOrganization(
        { ...result.org, _count: { branches: 1, users: 1 }, branches: [result.branch] },
        new Date(),
        true,
      ),
      admin: {
        phone: result.admin.phone,
        fullName: result.admin.fullName,
        password: data.adminPassword,
      },
      crmUrl: process.env.CRM_URL ?? 'http://localhost:3000',
    };
  }

  async publicTrialSignup(data: {
    name: string;
    slug?: string;
    contactPhone?: string;
    contactEmail?: string;
    branchName: string;
    branchAddress: string;
    branchPhone: string;
    adminFullName: string;
    adminPhone: string;
    adminPassword: string;
    demoDays?: number;
  }) {
    const demoDays = data.demoDays ?? PUBLIC_TRIAL_DAYS;
    const result = await this.createOrganization({
      ...data,
      demoDays,
      branchPhone: data.branchPhone || data.adminPhone,
    });

    void this.notifications.notifyTrialSignup({
      organizationName: result.organization.name,
      slug: result.organization.slug,
      branchName: data.branchName,
      branchAddress: data.branchAddress,
      branchPhone: this.normalizePhone(data.branchPhone || data.adminPhone),
      adminFullName: result.admin.fullName,
      adminPhone: result.admin.phone,
      contactEmail: data.contactEmail,
      demoDays,
      crmUrl: result.crmUrl,
    });

    return result;
  }

  async updateOrganization(
    id: string,
    data: Partial<{
      name: string;
      slug: string;
      contactPhone: string;
      contactEmail: string;
      plan: OrganizationPlan;
      isActive: boolean;
    }>,
  ) {
    if (data.slug) {
      const taken = await this.prisma.organization.findFirst({
        where: { slug: data.slug, id: { not: id } },
      });
      if (taken) throw new BadRequestException('Slug band');
    }

    const org = await this.prisma.organization.update({
      where: { id },
      data,
      include: {
        _count: { select: { branches: true, users: true } },
        branches: { take: 1 },
      },
    });
    return this.mapOrganization(org, new Date(), true);
  }

  async extendDemo(id: string, days = DEMO_DAYS) {
    const org = await this.prisma.organization.findUnique({ where: { id } });
    if (!org) throw new NotFoundException('Tashkilot topilmadi');

    const base = org.demoEndsAt && org.demoEndsAt > new Date() ? org.demoEndsAt : new Date();
    const demoEndsAt = new Date(base.getTime() + days * 86400000);

    const updated = await this.prisma.organization.update({
      where: { id },
      data: {
        plan: OrganizationPlan.demo,
        demoStartedAt: org.demoStartedAt ?? new Date(),
        demoEndsAt,
        isActive: true,
      },
      include: {
        _count: { select: { branches: true, users: true } },
        branches: { take: 1 },
      },
    });
    return this.mapOrganization(updated, new Date(), true);
  }

  async activatePlan(id: string) {
    return this.updateOrganization(id, {
      plan: OrganizationPlan.active,
      isActive: true,
    });
  }

  async dashboardStats() {
    const orgs = await this.prisma.organization.findMany();
    const now = new Date();
    let demoActive = 0;
    let demoExpired = 0;
    let active = 0;
    let suspended = 0;

    for (const o of orgs) {
      const status = this.resolvePlanStatus(o, now);
      if (status === 'demo_active') demoActive += 1;
      else if (status === 'demo_expired') demoExpired += 1;
      else if (status === 'active') active += 1;
      else if (status === 'suspended') suspended += 1;
    }

    const [branches, orders] = await Promise.all([
      this.prisma.branch.count(),
      this.prisma.order.count(),
    ]);

    return {
      totalOrganizations: orgs.length,
      demoActive,
      demoExpired,
      active,
      suspended,
      totalBranches: branches,
      totalOrders: orders,
    };
  }

  private async assertSlugAvailable(raw: string) {
    const slug = slugify(raw);
    if (!slug) throw new BadRequestException('Slug noto\'g\'ri');
    const existing = await this.prisma.organization.findUnique({ where: { slug } });
    if (existing) throw new BadRequestException('Bu slug band');
    return slug;
  }

  private async resolveSlug(base: string) {
    let candidate = slugify(base);
    if (!candidate) candidate = 'firma';
    let slug = candidate;
    let n = 1;
    while (await this.prisma.organization.findUnique({ where: { slug } })) {
      slug = `${candidate}-${++n}`;
    }
    return slug;
  }

  private normalizePhone(phone: string) {
    const digits = phone.replace(/\D/g, '');
    if (digits.startsWith('998')) return `+${digits}`;
    if (digits.length === 9) return `+998${digits}`;
    return phone.startsWith('+') ? phone : `+${digits}`;
  }

  private resolvePlanStatus(
    org: { plan: OrganizationPlan; demoEndsAt: Date | null; isActive: boolean },
    now: Date,
  ) {
    if (!org.isActive || org.plan === OrganizationPlan.suspended) return 'suspended';
    if (org.plan === OrganizationPlan.active) return 'active';
    if (org.plan === OrganizationPlan.expired) return 'demo_expired';
    if (org.plan === OrganizationPlan.demo) {
      if (org.demoEndsAt && org.demoEndsAt < now) return 'demo_expired';
      return 'demo_active';
    }
    return 'active';
  }

  private mapOrganization(
    org: {
      id: string;
      name: string;
      slug: string;
      plan: OrganizationPlan;
      demoStartedAt: Date | null;
      demoEndsAt: Date | null;
      isActive: boolean;
      contactPhone: string | null;
      contactEmail: string | null;
      createdAt: Date;
      _count?: { branches: number; users: number };
      branches?: unknown[];
      users?: unknown[];
    },
    now: Date,
    detailed = false,
  ) {
    const status = this.resolvePlanStatus(org, now);
    const demoDaysLeft =
      org.demoEndsAt && status === 'demo_active'
        ? Math.max(0, Math.ceil((org.demoEndsAt.getTime() - now.getTime()) / 86400000))
        : 0;

    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      plan: org.plan,
      status,
      demoStartedAt: org.demoStartedAt?.toISOString() ?? null,
      demoEndsAt: org.demoEndsAt?.toISOString() ?? null,
      demoDaysLeft,
      isActive: org.isActive,
      contactPhone: org.contactPhone,
      contactEmail: org.contactEmail,
      createdAt: org.createdAt.toISOString(),
      branchCount: org._count?.branches ?? 0,
      userCount: org._count?.users ?? 0,
      ...(detailed
        ? {
            branches: (org.branches as BranchWithCount[] | undefined)?.map((b) => ({
              id: b.id,
              name: b.name,
              address: b.address,
              phone: b.phone,
              isActive: b.isActive,
              orderCount: b._count?.orders ?? 0,
              staffCount: b._count?.userBranches ?? 0,
            })),
            staff: (org.users as StaffUser[] | undefined)?.map((u) => ({
              id: u.id,
              fullName: u.fullName,
              phone: u.phone,
              email: u.email ?? null,
              role: u.role,
              isActive: u.isActive,
              createdAt: u.createdAt?.toISOString?.() ?? null,
              branches: (u.userBranches ?? []).map((ub) => ub.branch.name),
            })),
          }
        : {}),
    };
  }
}
