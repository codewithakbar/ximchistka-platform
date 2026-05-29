import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';

export type TenantUser = {
  role: UserRole;
  organizationId?: string;
  branchIds: string[];
};

/** Buyurtmalarni faqat o'z tashkiloti/filiallari bo'yicha cheklash */
export function orderScopeForUser(user: TenantUser): Prisma.OrderWhereInput {
  if (user.role === UserRole.customer) {
    return { branchId: { in: [] } };
  }
  if (user.role === UserRole.platform_admin) {
    return { branchId: { in: [] } };
  }
  if (user.organizationId) {
    if (user.role === UserRole.super_admin) {
      return { branch: { organizationId: user.organizationId } };
    }
    if (user.branchIds?.length) {
      return { branchId: { in: user.branchIds } };
    }
    return { branch: { organizationId: user.organizationId } };
  }
  if (user.branchIds?.length) {
    return { branchId: { in: user.branchIds } };
  }
  return { branchId: { in: [] } };
}

/** Filiallar ro'yxati — tashkilot bo'yicha */
export function branchScopeForUser(
  user: TenantUser,
  opts?: { includeInactive?: boolean },
): Prisma.BranchWhereInput {
  const inactiveFilter: Prisma.BranchWhereInput =
    opts?.includeInactive || user.role === UserRole.super_admin ? {} : { isActive: true };

  if (user.role === UserRole.platform_admin) {
    return inactiveFilter;
  }
  if (user.organizationId) {
    const orgScope: Prisma.BranchWhereInput = {
      ...inactiveFilter,
      organizationId: user.organizationId,
    };
    if (user.role !== UserRole.super_admin) {
      if (user.branchIds?.length) {
        return { ...orgScope, id: { in: user.branchIds } };
      }
      return { ...orgScope, id: { in: [] } };
    }
    return orgScope;
  }
  if (user.branchIds?.length) {
    return { ...inactiveFilter, id: { in: user.branchIds } };
  }
  return { ...inactiveFilter, id: { in: [] } };
}

export async function assertBranchAccessible(
  prisma: { branch: { findUnique: (args: { where: { id: string } }) => Promise<{ organizationId: string } | null> } },
  user: TenantUser,
  branchId: string,
) {
  if (user.role === UserRole.platform_admin) {
    return;
  }

  const branch = await prisma.branch.findUnique({ where: { id: branchId } });
  if (!branch) throw new NotFoundException('Filial topilmadi');

  if (user.organizationId && branch.organizationId !== user.organizationId) {
    throw new ForbiddenException('Bu filial sizning tashkilotingizga tegishli emas');
  }

  if (user.role === UserRole.super_admin) {
    return;
  }

  if (user.branchIds?.length) {
    if (!user.branchIds.includes(branchId)) {
      throw new ForbiddenException('Bu filial uchun ruxsat yo\'q');
    }
    return;
  }

  if (user.organizationId) {
    return;
  }

  throw new ForbiddenException('Bu filial uchun ruxsat yo\'q');
}

export function staffScopeForUser(user: TenantUser): Prisma.UserWhereInput {
  if (user.role === UserRole.platform_admin) {
    return { role: { not: UserRole.customer } };
  }
  if (user.organizationId) {
    return { organizationId: user.organizationId };
  }
  return { id: { in: [] } };
}
