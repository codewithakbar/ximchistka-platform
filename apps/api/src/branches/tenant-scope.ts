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
    return { branch: { organizationId: user.organizationId } };
  }
  if (user.branchIds?.length) {
    return { branchId: { in: user.branchIds } };
  }
  return { branchId: { in: [] } };
}

/** Filiallar ro'yxati — tashkilot bo'yicha */
export function branchScopeForUser(user: TenantUser): Prisma.BranchWhereInput {
  const base: Prisma.BranchWhereInput = { isActive: true };

  if (user.role === UserRole.platform_admin) {
    return base;
  }
  if (user.organizationId) {
    return { ...base, organizationId: user.organizationId };
  }
  if (user.branchIds?.length) {
    return { ...base, id: { in: user.branchIds } };
  }
  return { ...base, id: { in: [] } };
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

  if (user.organizationId) {
    if (branch.organizationId !== user.organizationId) {
      throw new ForbiddenException('Bu filial sizning tashkilotingizga tegishli emas');
    }
    if (
      user.role !== UserRole.super_admin &&
      user.branchIds?.length &&
      !user.branchIds.includes(branchId)
    ) {
      throw new ForbiddenException('Bu filial uchun ruxsat yo\'q');
    }
    return;
  }

  if (!user.branchIds?.includes(branchId)) {
    throw new ForbiddenException('Bu filial uchun ruxsat yo\'q');
  }
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
