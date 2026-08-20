import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import {
  assertBranchAccessible,
  branchScopeForUser,
  orderScopeForUser,
  staffScopeForUser,
  type TenantUser,
} from './tenant-scope';

const ORG = 'org-1';
const OTHER_ORG = 'org-2';

function prismaWith(branch: { organizationId: string } | null) {
  return { branch: { findUnique: async () => branch } };
}

describe('orderScopeForUser', () => {
  it('mijoz va platform admin buyurtmalarni ko\'rmaydi', () => {
    const empty = { branchId: { in: [] } };
    expect(
      orderScopeForUser({ role: UserRole.customer, branchIds: [] }),
    ).toEqual(empty);
    expect(
      orderScopeForUser({ role: UserRole.platform_admin, branchIds: [] }),
    ).toEqual(empty);
  });

  it('super admin butun tashkilotni ko\'radi', () => {
    expect(
      orderScopeForUser({
        role: UserRole.super_admin,
        organizationId: ORG,
        branchIds: ['b1'],
      }),
    ).toEqual({ branch: { organizationId: ORG } });
  });

  it('operator faqat biriktirilgan filiallarni ko\'radi', () => {
    expect(
      orderScopeForUser({
        role: UserRole.operator,
        organizationId: ORG,
        branchIds: ['b1', 'b2'],
      }),
    ).toEqual({ branchId: { in: ['b1', 'b2'] } });
  });

  it('filial biriktirilmagan xodim tashkilot doirasida qoladi', () => {
    expect(
      orderScopeForUser({
        role: UserRole.operator,
        organizationId: ORG,
        branchIds: [],
      }),
    ).toEqual({ branch: { organizationId: ORG } });
  });

  it('tashkilotsiz va filialsiz xodim hech narsa ko\'rmaydi', () => {
    expect(orderScopeForUser({ role: UserRole.operator, branchIds: [] })).toEqual({
      branchId: { in: [] },
    });
  });
});

describe('branchScopeForUser', () => {
  it('super admin nofaol filiallarni ham ko\'radi', () => {
    expect(
      branchScopeForUser({
        role: UserRole.super_admin,
        organizationId: ORG,
        branchIds: [],
      }),
    ).toEqual({ organizationId: ORG });
  });

  it('operator faqat o\'z faol filiallarini ko\'radi', () => {
    expect(
      branchScopeForUser({
        role: UserRole.operator,
        organizationId: ORG,
        branchIds: ['b1'],
      }),
    ).toEqual({ isActive: true, organizationId: ORG, id: { in: ['b1'] } });
  });

  it('filiali yo\'q operator bo\'sh ro\'yxat oladi', () => {
    expect(
      branchScopeForUser({
        role: UserRole.operator,
        organizationId: ORG,
        branchIds: [],
      }),
    ).toEqual({ isActive: true, organizationId: ORG, id: { in: [] } });
  });
});

describe('assertBranchAccessible', () => {
  it('platform admin uchun tekshiruv o\'tkazilmaydi', async () => {
    await expect(
      assertBranchAccessible(
        prismaWith(null),
        { role: UserRole.platform_admin, branchIds: [] },
        'b1',
      ),
    ).resolves.toBeUndefined();
  });

  it('mavjud bo\'lmagan filial uchun NotFound', async () => {
    await expect(
      assertBranchAccessible(
        prismaWith(null),
        { role: UserRole.super_admin, organizationId: ORG, branchIds: [] },
        'b1',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('boshqa tashkilot filiali rad etiladi', async () => {
    await expect(
      assertBranchAccessible(
        prismaWith({ organizationId: OTHER_ORG }),
        { role: UserRole.super_admin, organizationId: ORG, branchIds: [] },
        'b1',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('biriktirilmagan filial operator uchun yopiq', async () => {
    const user: TenantUser = {
      role: UserRole.operator,
      organizationId: ORG,
      branchIds: ['b1'],
    };
    await expect(
      assertBranchAccessible(prismaWith({ organizationId: ORG }), user, 'b9'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      assertBranchAccessible(prismaWith({ organizationId: ORG }), user, 'b1'),
    ).resolves.toBeUndefined();
  });
});

describe('staffScopeForUser', () => {
  it('platform admin barcha xodimlarni ko\'radi', () => {
    expect(
      staffScopeForUser({ role: UserRole.platform_admin, branchIds: [] }),
    ).toEqual({ role: { not: UserRole.customer } });
  });

  it('firma xodimi faqat o\'z tashkilotini ko\'radi', () => {
    expect(
      staffScopeForUser({
        role: UserRole.super_admin,
        organizationId: ORG,
        branchIds: [],
      }),
    ).toEqual({ organizationId: ORG });
  });
});
