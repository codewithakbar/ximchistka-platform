import { OrganizationPlan } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { isDemoPeriodExpired } from './demo-expiry';

const PAST = new Date(Date.now() - 86400000);
const FUTURE = new Date(Date.now() + 86400000);

describe('isDemoPeriodExpired', () => {
  it('expired rejasi har doim tugagan hisoblanadi', () => {
    expect(
      isDemoPeriodExpired({ plan: OrganizationPlan.expired, demoEndsAt: FUTURE }),
    ).toBe(true);
  });

  it('muddati o\'tgan demo tugagan', () => {
    expect(
      isDemoPeriodExpired({ plan: OrganizationPlan.demo, demoEndsAt: PAST }),
    ).toBe(true);
  });

  it('muddati kelmagan demo tugamagan', () => {
    expect(
      isDemoPeriodExpired({ plan: OrganizationPlan.demo, demoEndsAt: FUTURE }),
    ).toBe(false);
  });

  it('sanasiz demo tugamagan hisoblanadi', () => {
    expect(
      isDemoPeriodExpired({ plan: OrganizationPlan.demo, demoEndsAt: null }),
    ).toBe(false);
  });

  it('to\'lovli tashkilot demo sanasidan qat\'i nazar ochiq', () => {
    expect(
      isDemoPeriodExpired({ plan: OrganizationPlan.active, demoEndsAt: PAST }),
    ).toBe(false);
  });

  it('suspended alohida holat — bu yerda tugagan deb belgilanmaydi', () => {
    expect(
      isDemoPeriodExpired({ plan: OrganizationPlan.suspended, demoEndsAt: PAST }),
    ).toBe(false);
  });
});
