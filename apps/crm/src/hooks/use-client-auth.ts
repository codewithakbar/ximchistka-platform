'use client';

import { useEffect, useState } from 'react';
import { getUser } from '@/lib/api';
import { canAddStaff, canCreateOrders, canManageBranches, StaffRole } from '@/lib/roles';

/** Role from localStorage — only after mount, to avoid SSR hydration mismatch. */
export function useClientRole() {
  const [role, setRole] = useState<StaffRole | null>(null);

  useEffect(() => {
    const r = getUser<{ role?: StaffRole }>()?.role;
    if (r) setRole(r);
  }, []);

  return role;
}

export function useCanCreateOrders() {
  const role = useClientRole();
  return role !== null && canCreateOrders(role);
}

export function useHasRole(...roles: StaffRole[]) {
  const role = useClientRole();
  return role !== null && roles.includes(role);
}

export function useCanAddStaff() {
  const role = useClientRole();
  return role !== null && canAddStaff(role);
}

export function useCanManageBranches() {
  const role = useClientRole();
  return role !== null && canManageBranches(role);
}
