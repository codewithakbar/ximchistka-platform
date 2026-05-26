import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrganizationPlan, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';

const DEMO_DAYS = 14;

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
  constructor(private prisma: PrismaService) {}

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
        branches: { orderBy: { name: 'asc' } },
        users: {
          where: { role: { in: [UserRole.super_admin, UserRole.branch_manager] } },
          select: {
            id: true,
            fullName: true,
            phone: true,
            role: true,
            isActive: true,
          },
        },
      },
    });
    if (!org) throw new NotFoundException('Tashkilot topilmadi');
    return this.mapOrganization(org, new Date(), true);
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
    const slug = data.slug?.trim() || slugify(data.name);
    const existing = await this.prisma.organization.findUnique({ where: { slug } });
    if (existing) throw new BadRequestException('Bu slug band');

    const phoneTaken = await this.prisma.user.findUnique({ where: { phone: data.adminPhone } });
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
          contactPhone: data.contactPhone,
          contactEmail: data.contactEmail,
        },
      });

      const branch = await tx.branch.create({
        data: {
          organizationId: org.id,
          name: data.branchName,
          address: data.branchAddress,
          phone: data.branchPhone,
        },
      });

      const admin = await tx.user.create({
        data: {
          organizationId: org.id,
          phone: data.adminPhone,
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
            branches: org.branches,
            admins: org.users,
          }
        : {}),
    };
  }
}
