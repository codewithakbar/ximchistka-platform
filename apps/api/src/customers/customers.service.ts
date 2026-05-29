import { Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { orderScopeForUser, TenantUser } from '../branches/tenant-scope';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  private normalizePhone(phone: string) {
    const digits = phone.replace(/\D/g, '');
    if (digits.startsWith('998')) return `+${digits}`;
    if (digits.length === 9) return `+998${digits}`;
    return phone.startsWith('+') ? phone : `+${digits}`;
  }

  async lookupByPhone(phone: string) {
    const normalized = this.normalizePhone(phone.trim());
    if (normalized.replace(/\D/g, '').length < 12) {
      return { found: false as const, phone: normalized };
    }

    const user = await this.prisma.user.findUnique({
      where: { phone: normalized },
      include: {
        customerProfile: {
          include: {
            addresses: { orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }] },
          },
        },
      },
    });

    if (!user || user.role !== UserRole.customer || !user.customerProfile) {
      return { found: false as const, phone: normalized };
    }

    const defaultAddress =
      user.customerProfile.addresses.find((a) => a.isDefault) ??
      user.customerProfile.addresses[0];

    return {
      found: true as const,
      phone: user.phone,
      fullName: user.fullName,
      profileId: user.customerProfile.id,
      addresses: user.customerProfile.addresses.map((a) => ({
        id: a.id,
        label: a.label,
        address: a.address,
        isDefault: a.isDefault,
      })),
      defaultAddress: defaultAddress?.address ?? null,
    };
  }

  async search(query: string | undefined, user: TenantUser) {
    const orgOrders = orderScopeForUser(user);

    const profiles = await this.prisma.customerProfile.findMany({
      where: {
        orders: { some: orgOrders },
        ...(query
          ? {
              OR: [
                { user: { fullName: { contains: query, mode: 'insensitive' } } },
                { user: { phone: { contains: query } } },
              ],
            }
          : {}),
      },
      include: {
        user: true,
        addresses: true,
        orders: {
          where: orgOrders,
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
      },
      take: 50,
    });

    return profiles;
  }

  getProfile(userId: string) {
    return this.prisma.customerProfile.findUnique({
      where: { userId },
      include: { user: true, addresses: true },
    });
  }

  async getById(profileId: string, user: TenantUser) {
    const orgOrders = orderScopeForUser(user);

    const profile = await this.prisma.customerProfile.findFirst({
      where: {
        id: profileId,
        orders: { some: orgOrders },
      },
      include: {
        user: true,
        addresses: { orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }] },
        orders: {
          where: orgOrders,
          orderBy: { createdAt: 'desc' },
          include: {
            branch: { select: { id: true, name: true } },
            payments: { select: { status: true, amount: true } },
          },
        },
      },
    });

    if (!profile) throw new NotFoundException('Mijoz topilmadi');

    const activeOrders = profile.orders.filter((o) => o.status !== OrderStatus.cancelled);
    const totalSpent = activeOrders.reduce((s, o) => s + o.totalAmount, 0);

    return {
      id: profile.id,
      notes: profile.notes,
      registeredAt: profile.createdAt,
      user: {
        id: profile.user.id,
        fullName: profile.user.fullName,
        phone: profile.user.phone,
        email: profile.user.email,
      },
      addresses: profile.addresses.map((a) => ({
        id: a.id,
        label: a.label,
        address: a.address,
        isDefault: a.isDefault,
      })),
      summary: {
        totalOrders: profile.orders.length,
        completedOrders: profile.orders.filter((o) => o.status === OrderStatus.completed).length,
        activeOrders: profile.orders.filter(
          (o) => o.status !== OrderStatus.completed && o.status !== OrderStatus.cancelled,
        ).length,
        totalSpent,
        avgOrder: activeOrders.length ? Math.round(totalSpent / activeOrders.length) : 0,
      },
      orders: profile.orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        totalAmount: o.totalAmount,
        discountAmount: o.discountAmount,
        createdAt: o.createdAt,
        updatedAt: o.updatedAt,
        branch: o.branch,
        paidAmount: o.payments
          .filter((p) => p.status === 'paid')
          .reduce((s, p) => s + p.amount, 0),
      })),
    };
  }

  addAddress(profileId: string, data: { label?: string; address: string; isDefault?: boolean }) {
    return this.prisma.customerAddress.create({
      data: { profileId, ...data },
    });
  }
}
