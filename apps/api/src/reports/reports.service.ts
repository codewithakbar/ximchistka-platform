import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, PaymentStatus, UserRole } from '@prisma/client';
import { ORDER_STATUS_LABELS } from '@ximchistka/shared';
import { PrismaService } from '../prisma/prisma.service';
import { BranchesService } from '../branches/branches.service';
import { ExpensesService } from '../expenses/expenses.service';

@Injectable()
export class ReportsService {
  constructor(
    private prisma: PrismaService,
    private branches: BranchesService,
    private expenses: ExpensesService,
  ) {}

  /** Sana oralig'i — UTC kun chegaralari (CRM date input bilan mos) */
  private parseDateRange(from: string, to: string) {
    const fromDate = new Date(`${from}T00:00:00.000Z`);
    const toDate = new Date(`${to}T23:59:59.999Z`);
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      throw new BadRequestException('Sana formati noto\'g\'ri');
    }
    return { fromDate, toDate };
  }

  /**
   * Hisobotda: yaratilgan yoki shu davrda yakunlangan buyurtmalar.
   * Bekor qilinganlar ham qaytadi (ro'yxatda ko'rsatish uchun) — lekin
   * tushum hisobida ishtirok etmaydi (revenueOf orqali 0 deb hisoblanadi).
   */
  private ordersInReportPeriod(
    orgScope: object,
    fromDate: Date,
    toDate: Date,
    branchId?: string,
  ) {
    return {
      ...orgScope,
      ...(branchId ? { branchId } : {}),
      OR: [
        { createdAt: { gte: fromDate, lte: toDate } },
        {
          status: OrderStatus.completed,
          updatedAt: { gte: fromDate, lte: toDate },
        },
      ],
    };
  }

  /**
   * Kassa: davr ichida QABUL QILINGAN to'lovlar (to'lov sanasi bo'yicha),
   * usulga ajratilgan holda. Buyurtma qachon yaratilganidan qat'i nazar.
   */
  private async kassaBreakdown(
    orderWhere: object,
    fromDate: Date,
    toDate: Date,
  ) {
    const groups = await this.prisma.payment.groupBy({
      by: ['provider'],
      where: {
        status: PaymentStatus.paid,
        createdAt: { gte: fromDate, lte: toDate },
        order: orderWhere,
      },
      _sum: { amount: true },
      _count: { _all: true },
    });

    const byProvider = groups
      .map((g) => ({
        provider: g.provider,
        amount: g._sum.amount ?? 0,
        count: g._count._all,
      }))
      .sort((a, b) => b.amount - a.amount);

    return {
      totalPaid: byProvider.reduce((sum, g) => sum + g.amount, 0),
      byProvider,
    };
  }

  /** Bekor qilingan buyurtma tushumga kirmaydi */
  private revenueOf(order: { status: OrderStatus; totalAmount: number }) {
    return order.status === OrderStatus.cancelled ? 0 : order.totalAmount;
  }

  private reportDayKey(order: { status: OrderStatus; createdAt: Date; updatedAt: Date }) {
    if (order.status === OrderStatus.completed) {
      return order.updatedAt.toISOString().slice(0, 10);
    }
    return order.createdAt.toISOString().slice(0, 10);
  }

  async dashboard(user: { role: UserRole; organizationId?: string; branchIds: string[] }) {
    const orgScope = this.branches.orderScopeForUser(user);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todayOrders, readyOrders, inProcessing, revenueToday] = await Promise.all([
      this.prisma.order.count({
        where: { ...orgScope, createdAt: { gte: today } },
      }),
      this.prisma.order.count({
        where: { ...orgScope, status: OrderStatus.ready },
      }),
      this.prisma.order.count({
        where: { ...orgScope, status: OrderStatus.in_processing },
      }),
      this.prisma.order.aggregate({
        where: {
          ...orgScope,
          createdAt: { gte: today },
          status: { not: OrderStatus.cancelled },
        },
        _sum: { totalAmount: true },
      }),
    ]);

    return {
      todayOrders,
      readyOrders,
      inProcessing,
      revenueToday: revenueToday._sum.totalAmount ?? 0,
    };
  }

  async dailyReport(
    from: string,
    to: string,
    user: { role: UserRole; organizationId?: string; branchIds: string[] },
    branchId?: string,
  ) {
    const { fromDate, toDate } = this.parseDateRange(from, to);

    const orgScope = this.branches.orderScopeForUser(user);
    if (branchId) {
      await this.branches.assertBranchAccess(user, branchId);
    }

    const [allOrders, kassa] = await Promise.all([
      this.prisma.order.findMany({
        where: this.ordersInReportPeriod(orgScope, fromDate, toDate, branchId),
        include: { branch: true },
        orderBy: { createdAt: 'asc' },
      }),
      this.kassaBreakdown(
        { ...orgScope, ...(branchId ? { branchId } : {}) },
        fromDate,
        toDate,
      ),
    ]);

    const organizationId = user.organizationId;
    const expenses = organizationId
      ? await this.expenses.totalForReport(organizationId, fromDate, toDate, branchId)
      : { total: 0, byCategory: [] as { category: string; amount: number }[] };

    // Metrikalar faqat to'lovli (bekor qilinmagan) buyurtmalardan hisoblanadi
    const orders = allOrders.filter((o) => o.status !== OrderStatus.cancelled);
    const cancelled = allOrders.filter((o) => o.status === OrderStatus.cancelled);

    const branchWhere = {
      ...this.branches.branchScopeForUser(user),
      ...(branchId ? { id: branchId } : {}),
    };

    const branches = await this.prisma.branch.findMany({
      where: branchWhere,
      orderBy: { name: 'asc' },
    });

    const byDay = orders.reduce<Record<string, { count: number; revenue: number }>>((acc, o) => {
      const day = this.reportDayKey(o);
      if (!acc[day]) acc[day] = { count: 0, revenue: 0 };
      acc[day].count += 1;
      acc[day].revenue += o.totalAmount;
      return acc;
    }, {});

    const byBranchAgg = orders.reduce<Record<string, { count: number; revenue: number }>>((acc, o) => {
      if (!acc[o.branchId]) acc[o.branchId] = { count: 0, revenue: 0 };
      acc[o.branchId].count += 1;
      acc[o.branchId].revenue += o.totalAmount;
      return acc;
    }, {});

    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((s, o) => s + o.totalAmount, 0);

    const byBranch = branches.map((b) => {
      const stats = byBranchAgg[b.id] ?? { count: 0, revenue: 0 };
      return {
        branchId: b.id,
        branchName: b.name,
        orderCount: stats.count,
        revenue: stats.revenue,
        avgOrder: stats.count ? Math.round(stats.revenue / stats.count) : 0,
        orderSharePercent: totalOrders ? Math.round((stats.count / totalOrders) * 1000) / 10 : 0,
        revenueSharePercent: totalRevenue
          ? Math.round((stats.revenue / totalRevenue) * 1000) / 10
          : 0,
      };
    });

    return {
      totalOrders,
      totalRevenue,
      cancelledOrders: cancelled.length,
      avgOrderAmount: totalOrders ? Math.round(totalRevenue / totalOrders) : 0,
      branchCount: branches.length,
      kassa,
      expenses,
      netProfit: totalRevenue - expenses.total,
      byDay: Object.entries(byDay)
        .map(([date, stats]) => ({
          date,
          count: stats.count,
          revenue: stats.revenue,
        }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      byBranch,
      // CSV/ro'yxat uchun barcha buyurtmalar (bekor qilinganlar ham, status bilan)
      orders: allOrders,
    };
  }

  async branchFinance(
    branchId: string,
    from: string,
    to: string,
    user: { role: UserRole; organizationId?: string; branchIds: string[] },
  ) {
    await this.branches.assertBranchAccess(user, branchId);

    const branch = await this.prisma.branch.findUnique({ where: { id: branchId } });
    if (!branch) throw new NotFoundException('Filial topilmadi');

    const { fromDate, toDate } = this.parseDateRange(from, to);

    const orders = await this.prisma.order.findMany({
      where: this.ordersInReportPeriod({}, fromDate, toDate, branchId),
      include: {
        customer: { include: { user: { select: { fullName: true, phone: true } } } },
        payments: { orderBy: { createdAt: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const orderIds = orders.map((o) => o.id);

    const kassa = await this.kassaBreakdown({ branchId }, fromDate, toDate);
    const expenses = await this.expenses.totalForReport(
      branch.organizationId,
      fromDate,
      toDate,
      branchId,
    );

    const payments = await this.prisma.payment.findMany({
      where: {
        orderId: { in: orderIds },
      },
      include: {
        order: {
          select: {
            orderNumber: true,
            status: true,
            customer: { include: { user: { select: { fullName: true } } } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const billableOrders = orders.filter((o) => o.status !== OrderStatus.cancelled);
    const cancelledOrders = orders.filter((o) => o.status === OrderStatus.cancelled);
    const totalRevenue = billableOrders.reduce((s, o) => s + o.totalAmount, 0);
    const paidPayments = payments.filter((p) => p.status === PaymentStatus.paid);
    const totalPaid = paidPayments.reduce((s, p) => s + p.amount, 0);
    const totalPending = payments
      .filter((p) => p.status === PaymentStatus.pending)
      .reduce((s, p) => s + p.amount, 0);

    const revenueByDay = billableOrders.reduce<Record<string, { count: number; revenue: number }>>((acc, o) => {
      const day = this.reportDayKey(o);
      if (!acc[day]) acc[day] = { count: 0, revenue: 0 };
      acc[day].count += 1;
      acc[day].revenue += o.totalAmount;
      return acc;
    }, {});

    const revenueHistory = orders.map((o) => ({
      id: o.id,
      date: o.createdAt.toISOString(),
      orderNumber: o.orderNumber,
      customerName: o.customer.user.fullName,
      customerPhone: o.customer.user.phone,
      amount: o.totalAmount,
      status: o.status,
      statusLabel: ORDER_STATUS_LABELS[o.status as keyof typeof ORDER_STATUS_LABELS] ?? o.status,
      paidAmount: o.payments
        .filter((p) => p.status === PaymentStatus.paid)
        .reduce((s, p) => s + p.amount, 0),
    }));

    const paymentHistory = payments.map((p) => ({
      id: p.id,
      date: p.createdAt.toISOString(),
      orderId: p.orderId,
      orderNumber: p.order.orderNumber,
      customerName: p.order.customer.user.fullName,
      provider: p.provider,
      status: p.status,
      amount: p.amount,
    }));

    const ledgerEvents = [
      ...billableOrders.map((o) => ({
        id: `order-${o.id}`,
        kind: 'order' as const,
        date: o.createdAt.toISOString(),
        title: `Buyurtma ${o.orderNumber}`,
        subtitle: o.customer.user.fullName,
        amount: o.totalAmount,
        direction: 'credit' as const,
        status: o.status,
        statusLabel: ORDER_STATUS_LABELS[o.status as keyof typeof ORDER_STATUS_LABELS] ?? o.status,
        orderId: o.id,
      })),
      ...paidPayments.map((p) => {
        const payRow = payments.find((x) => x.id === p.id);
        return {
          id: `payment-${p.id}`,
          kind: 'payment' as const,
          date: p.createdAt.toISOString(),
          title: `To'lov: ${payRow?.order.orderNumber ?? p.orderId}`,
          subtitle: `${payRow?.order.customer.user.fullName ?? ''} · ${p.provider}`,
          amount: p.amount,
          direction: 'credit' as const,
          status: p.status,
          statusLabel: 'To\'langan',
          orderId: p.orderId,
        };
      }),
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let runningBalance = 0;
    const ledger = ledgerEvents.map((entry) => {
      if (entry.kind === 'payment') {
        runningBalance += entry.amount;
      }
      return { ...entry, balanceAfter: runningBalance };
    });

    return {
      branch: {
        id: branch.id,
        name: branch.name,
        address: branch.address,
        phone: branch.phone,
        openTime: branch.openTime,
        closeTime: branch.closeTime,
        isActive: branch.isActive,
        orderNumberPrefix: branch.orderNumberPrefix,
        orderNumberNext: branch.orderNumberNext,
      },
      period: { from, to },
      summary: {
        totalOrders: billableOrders.length,
        cancelledOrders: cancelledOrders.length,
        completedOrders: orders.filter((o) => o.status === OrderStatus.completed).length,
        totalRevenue,
        totalPaid,
        totalPending,
        avgOrder: billableOrders.length ? Math.round(totalRevenue / billableOrders.length) : 0,
        collectionRate: totalRevenue
          ? Math.round((totalPaid / totalRevenue) * 1000) / 10
          : 0,
        kassa,
        expenses: expenses.total,
        netProfit: totalRevenue - expenses.total,
      },
      revenueByDay: Object.entries(revenueByDay)
        .map(([date, stats]) => ({ date, ...stats }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      revenueHistory,
      paymentHistory,
      ledger: [...ledger].reverse(),
    };
  }

  exportCsv(
    from: string,
    to: string,
    user: { role: UserRole; organizationId?: string; branchIds: string[] },
    branchId?: string,
  ) {
    return this.dailyReport(from, to, user, branchId).then((report) => {
      const summaryHeader = 'Filial,Buyurtmalar,Tushum,O\'rtacha buyurtma,Buyurtma ulushi %,Tushum ulushi %\n';
      const summaryRows = report.byBranch
        .map(
          (b) =>
            `${b.branchName},${b.orderCount},${b.revenue},${b.avgOrder},${b.orderSharePercent},${b.revenueSharePercent}`,
        )
        .join('\n');
      const totalsRow = `JAMI,${report.totalOrders},${report.totalRevenue},${report.avgOrderAmount},100,100\n`;

      const ordersHeader = '\n\nSana,Buyurtma,Filial,Summa,Status\n';
      const orderRows = report.orders
        .map(
          (o) =>
            `${o.createdAt.toISOString()},${o.orderNumber},${o.branch.name},${o.totalAmount},${o.status}`,
        )
        .join('\n');

      return { csv: summaryHeader + summaryRows + '\n' + totalsRow + ordersHeader + orderRows };
    });
  }
}
