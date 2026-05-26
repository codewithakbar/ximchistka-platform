'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';
import { ensureValidSession, getToken, getUser } from '@/lib/api';
import { canAccessRoute } from '@/lib/roles';
import { Skeleton } from '@/components/ui/skeleton';

export function AppShell({ title, children }: { title: string; children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

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
          <p className="text-sm text-muted-foreground text-center">Yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar title={title} />
        <main className="flex-1 overflow-y-auto scrollbar-thin animate-fade-in">
          <div className="container mx-auto max-w-7xl px-6 py-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
