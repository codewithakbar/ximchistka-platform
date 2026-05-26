'use client';

import { Search, Building2 } from 'lucide-react';
import { NotificationBell } from './notification-bell';
import { useEffect, useState } from 'react';
import { api, getUser } from '@/lib/api';
import { Badge } from '@/components/ui/badge';

export function Topbar({ title }: { title: string }) {
  const [user, setUser] = useState<{ role?: string; fullName?: string } | null>(null);
  const [orgName, setOrgName] = useState<string | null>(null);
  const [demoRemainingDays, setDemoRemainingDays] = useState<number | null>(null);
  const [demoPlan, setDemoPlan] = useState<string | null>(null);

  useEffect(() => {
    setUser(getUser<{ role?: string; fullName?: string; organizationId?: string }>());
    api<{
      organization?: { name: string; plan?: string; demoEndsAt?: string | null };
    }>('/settings/profile')
      .then((p) => {
        const org = p.organization;
        setOrgName(org?.name ?? null);
        setDemoPlan(org?.plan ?? null);

        if (org?.plan === 'demo' && org?.demoEndsAt) {
          const endsAt = new Date(org.demoEndsAt).getTime();
          const days = Math.max(0, Math.ceil((endsAt - Date.now()) / 86400000));
          setDemoRemainingDays(days);
        } else {
          setDemoRemainingDays(null);
        }
      })
      .catch(() => {
        const stored = getUser<{ organizationName?: string }>();
        if (stored?.organizationName) setOrgName(stored.organizationName);
      });
  }, []);

  return (
    <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between border-b border-border bg-background/80 backdrop-blur-md px-6 py-2">
      <div className="min-w-0">
        <h1 className="truncate text-lg font-semibold">{title}</h1>
        {orgName && (
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground">
              <Building2 className="h-3 w-3" />
              <span className="truncate max-w-[220px] md:max-w-[320px]">{orgName}</span>
            </span>
            {demoPlan === 'demo' && demoRemainingDays !== null && (
              <Badge variant="warning" className="px-2.5 py-1 text-[11px] font-semibold">
                Demo: {demoRemainingDays} kun qoldi
              </Badge>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            placeholder="Qidirish..."
            className="h-9 w-64 rounded-lg border border-input bg-card pl-9 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <NotificationBell />
        <div className="flex items-center gap-2 pl-3 border-l border-border">
          <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
            {(user?.fullName ?? 'A').charAt(0).toUpperCase()}
          </div>
          <div className="hidden md:block">
            <div className="text-sm font-medium">{user?.fullName ?? 'Admin'}</div>
            <div className="text-xs text-muted-foreground">
              {user?.role ? user.role.replace(/_/g, ' ') : 'super admin'}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}