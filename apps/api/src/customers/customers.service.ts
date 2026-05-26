import { Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { orderScopeForUser, TenantUser } from '../branches/tenant-scope';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

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

  addAddress(profileId: string, data: { label?: string; address: string; isDefault?: boolean }) {
    return this.prisma.customerAddress.create({
      data: { profileId, ...data },
    });
  }
}
