'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';
import { DemoExpiredLock } from './demo-expired-lock';
import { api, ensureValidSession, getToken, getUser } from '@/lib/api';
import { canAccessRoute } from '@/lib/roles';
import { Skeleton } from '@/components/ui/skeleton';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export function AppShell({
  title,
  children,
  flush = false,
}: {
  title: string;
  children: React.ReactNode;
  flush?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useI18n();
  const [ready, setReady] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [demoExpired, setDemoExpired] = useState(false);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileNavOpen || demoExpired ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileNavOpen, demoExpired]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!getToken()) {
        router.replace('/login');
        return;
      }

      const valid = await ensureValidSession();
      if (cancelled) return;

      if (!valid) {
        router.replace('/login');
        return;
      }

      const user = getUser<{ role?: string }>();
      if (user?.role && !canAccessRoute(user.role, pathname)) {
        router.replace('/dashboard');
        return;
      }

      try {
        const p = await api<{
          organization?: { plan?: string; demoEndsAt?: string | null; demoExpired?: boolean };
        }>('/settings/profile');
        if (cancelled) return;
        const org = p.organization;
        setDemoExpired(
          org?.demoExpired === true ||
            org?.plan === 'expired' ||
            (org?.plan === 'demo' &&
              !!org.demoEndsAt &&
              new Date(org.demoEndsAt).getTime() < Date.now()),
        );
      } catch {
        if (cancelled) return;
      }

      setReady(true);
    }

    setReady(false);
    init();

    return () => {
      cancelled = true;
    };
  }, [router, pathname]);

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="space-y-3 w-64">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <p className="text-sm text-muted-foreground text-center">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar mobileOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Topbar title={title} onMenuClick={() => setMobileNavOpen(true)} />
        {demoExpired && <DemoExpiredLock />}
        <main
          className={cn(
            'flex-1 animate-fade-in',
            flush ? 'overflow-hidden' : 'overflow-y-auto scrollbar-thin',
          )}
        >
          <div
            className={cn(
              flush ? 'h-full' : 'mx-auto max-w-7xl px-4 sm:px-6 py-4 sm:py-6',
            )}
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
