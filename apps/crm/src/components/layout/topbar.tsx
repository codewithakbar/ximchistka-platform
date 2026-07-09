'use client';

import Link from 'next/link';
import { Building2, Menu, Send } from 'lucide-react';
import { NotificationBell } from './notification-bell';
import { useEffect, useState } from 'react';
import { api, getUser, updateStoredUser } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { StaffAvatar } from '@/components/staff/staff-avatar';
import { useI18n } from '@/lib/i18n';
import { ThemeToggle, LanguageToggle } from './prefs-controls';

const SUPPORT_TELEGRAM = 'https://t.me/avilab_uz_support';

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
  const [isDemo, setIsDemo] = useState(false);

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
        const demo = org?.plan === 'demo';
        setIsDemo(demo);

        if (demo && org?.demoEndsAt) {
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

  return (
    <div className="sticky top-0 z-20 shrink-0">
      <header className="flex h-14 sm:h-16 items-center justify-between gap-2 border-b border-border bg-background/95 backdrop-blur-md px-3 sm:px-6">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            type="button"
            onClick={onMenuClick}
            className="md:hidden h-9 w-9 shrink-0 inline-flex items-center justify-center rounded-lg border border-border bg-card hover:bg-secondary"
            aria-label={t('common.menu')}
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base sm:text-lg font-semibold leading-tight">{title}</h1>
            {orgName && (
              <div className="mt-0.5 hidden sm:flex items-center gap-2 min-w-0">
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground min-w-0">
                  <Building2 className="h-3 w-3 shrink-0" />
                  <span className="truncate max-w-[200px] md:max-w-[280px]">{orgName}</span>
                </span>
                {isDemo && demoRemainingDays !== null && (
                  <Badge variant="warning" className="px-1.5 py-0 text-[10px] font-semibold shrink-0">
                    {t('topbar.demo')}: {demoRemainingDays} {t('topbar.days')}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <LanguageToggle compact />
          <ThemeToggle />
          <NotificationBell />
          <Link
            href="/settings"
            title={t('common.viewProfile')}
            className="group inline-flex items-center rounded-lg p-0.5 transition-colors hover:bg-secondary"
          >
            <StaffAvatar
              name={user?.fullName ?? 'Admin'}
              src={user?.avatarUrl}
              role={user?.role}
              size="sm"
            />
          </Link>
        </div>
      </header>

      {isDemo && (
        <div className="flex items-center justify-between gap-2 border-b border-amber-500/30 bg-amber-500/10 px-3 sm:px-6 py-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs sm:text-sm text-amber-900 dark:text-amber-100 leading-snug">
              <span className="sm:hidden">
                {orgName ? `${orgName} · ` : ''}
                {demoRemainingDays !== null
                  ? `${t('topbar.demo')}: ${demoRemainingDays} ${t('topbar.days')}`
                  : t('topbar.demo')}
              </span>
              <span className="hidden sm:inline">{t('topbar.demoSupportHint')}</span>
            </p>
          </div>
          <a
            href={SUPPORT_TELEGRAM}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 shrink-0 rounded-lg bg-[#2AABEE] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[#229ED9] transition-colors"
          >
            <Send className="h-3.5 w-3.5" />
            <span>@avilab_uz_support</span>
          </a>
        </div>
      )}
    </div>
  );
}
