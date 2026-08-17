import { OrganizationPlan } from '@prisma/client';

type OrgLike = {
  id: string;
  plan: OrganizationPlan;
  demoEndsAt: Date | null;
  isActive: boolean;
};

export function isDemoPeriodExpired(org: Pick<OrgLike, 'plan' | 'demoEndsAt'>): boolean {
  if (org.plan === OrganizationPlan.expired) return true;
  return (
    org.plan === OrganizationPlan.demo &&
    !!org.demoEndsAt &&
    org.demoEndsAt < new Date()
  );
}
