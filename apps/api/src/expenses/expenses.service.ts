import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BranchesService } from '../branches/branches.service';
import { TenantUser } from '../branches/tenant-scope';

export const EXPENSE_CATEGORIES = [
  'rent',
  'salary',
  'supplies',
  'utilities',
  'transport',
  'other',
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

type ActorUser = TenantUser & { id: string };

@Injectable()
export class ExpensesService {
  constructor(
    private prisma: PrismaService,
    private branches: BranchesService,
  ) {}

  private requireOrg(user: TenantUser) {
    if (!user.organizationId) throw new ForbiddenException('Tashkilot topilmadi');
    return user.organizationId;
  }

  private parseRange(from?: string, to?: string) {
    const now = new Date();
    // Standart oralik ham UTC (aniq berilgan sanalar bilan izchil)
    const fromDate = from
      ? new Date(`${from}T00:00:00.000Z`)
      : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const toDate = to ? new Date(`${to}T23:59:59.999Z`) : now;
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      throw new BadRequestException('Sana formati noto\'g\'ri');
    }
    return { fromDate, toDate };
  }

  /** Foydalanuvchi ko'ra oladigan xarajatlar doirasi (tashkilot + filial) */
  private scopeWhere(user: TenantUser, branchId?: string): Prisma.ExpenseWhereInput {
    const organizationId = this.requireOrg(user);
    const where: Prisma.ExpenseWhereInput = { organizationId };

    if (user.role !== UserRole.super_admin) {
      // Filial menejeri faqat o'z filiallari (va umumiy) xarajatlarini ko'radi
      const ids = user.branchIds ?? [];
      where.OR = [{ branchId: { in: ids.length ? ids : ['__none__'] } }, { branchId: null }];
    }
    if (branchId) where.branchId = branchId;
    return where;
  }

  async list(user: TenantUser, query: { from?: string; to?: string; branchId?: string }) {
    const { fromDate, toDate } = this.parseRange(query.from, query.to);
    if (query.branchId) await this.branches.assertBranchAccess(user, query.branchId);

    const where: Prisma.ExpenseWhereInput = {
      ...this.scopeWhere(user, query.branchId),
      spentAt: { gte: fromDate, lte: toDate },
    };

    const [rows, agg, byCategory] = await Promise.all([
      this.prisma.expense.findMany({
        where,
        include: {
          branch: { select: { id: true, name: true } },
          creator: { select: { fullName: true } },
        },
        orderBy: { spentAt: 'desc' },
        take: 200,
      }),
      this.prisma.expense.aggregate({ where, _sum: { amount: true }, _count: { _all: true } }),
      this.prisma.expense.groupBy({
        by: ['category'],
        where,
        _sum: { amount: true },
      }),
    ]);

    return {
      total: agg._sum.amount ?? 0,
      count: agg._count._all,
      byCategory: byCategory
        .map((g) => ({ category: g.category, amount: g._sum.amount ?? 0 }))
        .sort((a, b) => b.amount - a.amount),
      items: rows.map((e) => ({
        id: e.id,
        category: e.category,
        amount: e.amount,
        note: e.note,
        spentAt: e.spentAt.toISOString(),
        branch: e.branch,
        createdBy: e.creator?.fullName ?? null,
      })),
    };
  }

  async create(
    user: ActorUser,
    data: { branchId?: string | null; category: string; amount: number; note?: string; spentAt?: string },
  ) {
    const organizationId = this.requireOrg(user);

    const amount = Math.floor(Number(data.amount));
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('Summa 0 dan katta bo\'lishi kerak');
    }

    const category = EXPENSE_CATEGORIES.includes(data.category as ExpenseCategory)
      ? data.category
      : 'other';

    let branchId: string | null = null;
    if (data.branchId) {
      await this.branches.assertBranchAccess(user, data.branchId);
      // Menejer faqat o'ziga biriktirilgan filialga xarajat yozadi
      if (
        user.role !== UserRole.super_admin &&
        !(user.branchIds ?? []).includes(data.branchId)
      ) {
        throw new ForbiddenException('Bu filialga xarajat qo\'shishga ruxsat yo\'q');
      }
      branchId = data.branchId;
    } else if (user.role !== UserRole.super_admin) {
      // Menejer umumiy xarajat qo'sha olmaydi — filial tanlashi shart
      throw new BadRequestException('Filialni tanlang');
    }

    let spentAt: Date | undefined;
    if (data.spentAt) {
      const d = new Date(data.spentAt);
      if (Number.isNaN(d.getTime())) throw new BadRequestException('Sana noto\'g\'ri');
      spentAt = d;
    }

    const expense = await this.prisma.expense.create({
      data: {
        organizationId,
        branchId,
        category,
        amount,
        note: data.note?.trim()?.slice(0, 300) || null,
        createdBy: user.id,
        ...(spentAt ? { spentAt } : {}),
      },
      include: { branch: { select: { id: true, name: true } } },
    });
    return expense;
  }

  async remove(user: TenantUser, id: string) {
    const organizationId = this.requireOrg(user);
    const expense = await this.prisma.expense.findFirst({
      where: { id, organizationId },
    });
    if (!expense) throw new NotFoundException('Xarajat topilmadi');

    // Menejer faqat o'z filiali xarajatini o'chira oladi
    if (user.role !== UserRole.super_admin) {
      if (!expense.branchId || !(user.branchIds ?? []).includes(expense.branchId)) {
        throw new ForbiddenException('Bu xarajatni o\'chirishga ruxsat yo\'q');
      }
    }

    await this.prisma.expense.delete({ where: { id } });
    return { deleted: true, id };
  }

  /** Hisobotlar uchun: davr va filial bo'yicha jami xarajat */
  async totalForReport(
    organizationId: string,
    fromDate: Date,
    toDate: Date,
    branchId?: string,
  ) {
    const where: Prisma.ExpenseWhereInput = {
      organizationId,
      spentAt: { gte: fromDate, lte: toDate },
      ...(branchId ? { branchId } : {}),
    };
    const [agg, byCategory] = await Promise.all([
      this.prisma.expense.aggregate({ where, _sum: { amount: true } }),
      this.prisma.expense.groupBy({ by: ['category'], where, _sum: { amount: true } }),
    ]);
    return {
      total: agg._sum.amount ?? 0,
      byCategory: byCategory
        .map((g) => ({ category: g.category, amount: g._sum.amount ?? 0 }))
        .sort((a, b) => b.amount - a.amount),
    };
  }
}
