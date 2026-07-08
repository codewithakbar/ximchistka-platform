'use client';

import Link from 'next/link';
import { Search, Building2, ChevronRight, Menu } from 'lucide-react';
import { NotificationBell } from './notification-bell';
import { useEffect, useState } from 'react';
import { api, getUser, updateStoredUser } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { StaffAvatar } from '@/components/staff/staff-avatar';
import { StaffRole } from '@/lib/roles';
import { useI18n } from '@/lib/i18n';
import { ThemeToggle, LanguageToggle } from './prefs-controls';

type TopbarUser = {
  role?: string;
  fullName?: string;
  avatarUrl?: string | null;
};

export function Topbar({ title, onMenuClick }: { title: string; onMenuClick?: () => void }) {
  const { t } = useI18n();
  const [user, setUser] = useState<TopbarUser | null>(null);
  const [orgName, setOrgName] = useState<string | null>(null);
  const [demoRemainingDays, setDemoRemainingDays] = useState<number | null>(null);
  const [demoPlan, setDemoPlan] = useState<string | null>(null);

  useEffect(() => {
    setUser(getUser<TopbarUser>());
    api<{
      fullName?: string;
      role?: string;
      avatarUrl?: string | null;
      organization?: { name: string; plan?: string; demoEndsAt?: string | null };
    }>('/settings/profile')
      .then((p) => {
        setUser((prev) => ({
          ...prev,
          fullName: p.fullName ?? prev?.fullName,
          role: p.role ?? prev?.role,
          avatarUrl: p.avatarUrl ?? null,
        }));
        updateStoredUser({ avatarUrl: p.avatarUrl ?? null });

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

    function syncFromStore() {
      const stored = getUser<TopbarUser>();
      if (stored) {
        setUser((prev) => ({ ...prev, ...stored }));
      }
    }
    window.addEventListener('profile-updated', syncFromStore);
    return () => window.removeEventListener('profile-updated', syncFromStore);
  }, []);

  const roleLabel = user?.role
    ? t(`role.${user.role}`, user.role.replace(/_/g, ' '))
    : t('role.super_admin');

  return (
    <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between gap-2 border-b border-border bg-background/80 backdrop-blur-md px-4 sm:px-6 py-2">
      <div className="flex items-center gap-2 min-w-0">
        <button
          type="button"
          onClick={onMenuClick}
          className="md:hidden h-9 w-9 shrink-0 inline-flex items-center justify-center rounded-lg border border-border bg-card hover:bg-secondary"
          aria-label={t('common.menu')}
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <h1 className="truncate text-base sm:text-lg font-semibold">{title}</h1>
          {orgName && (
            <div className="mt-0.5 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-0.5 text-xs text-muted-foreground">
                <Building2 className="h-3 w-3 shrink-0" />
                <span className="truncate max-w-[140px] sm:max-w-[220px] md:max-w-[320px]">{orgName}</span>
              </span>
              {demoPlan === 'demo' && demoRemainingDays !== null && (
                <Badge variant="warning" className="px-2 py-0.5 text-[11px] font-semibold">
                  {t('topbar.demo')}: {demoRemainingDays} {t('topbar.days')}
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <div className="relative hidden lg:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            placeholder={t('topbar.search')}
            className="h-9 w-48 xl:w-56 rounded-lg border border-input bg-card pl-9 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <LanguageToggle />
        <ThemeToggle />
        <NotificationBell />
        <Link
          href="/settings"
          title={t('common.viewProfile')}
          className="group flex items-center gap-2 pl-3 border-l border-border rounded-lg py-1 pr-1 transition-colors hover:bg-secondary"
        >
          <StaffAvatar
            name={user?.fullName ?? 'Admin'}
            src={user?.avatarUrl}
            role={user?.role}
            size="sm"
          />
          <div className="hidden md:block text-left">
            <div className="text-sm font-medium leading-tight group-hover:text-primary transition-colors">
              {user?.fullName ?? 'Admin'}
            </div>
            <div className="text-xs text-muted-foreground">{roleLabel}</div>
          </div>
          <ChevronRight className="hidden md:block h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </Link>
      </div>
    </header>
  );
}