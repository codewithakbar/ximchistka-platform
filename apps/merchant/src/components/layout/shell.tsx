'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Layers, LogOut, LayoutDashboard, Settings } from 'lucide-react';
import { clearAuth, ensureValidSession, getToken, getUser } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Firmalar', icon: LayoutDashboard },
  { href: '/settings', label: 'Sozlamalar', icon: Settings },
] as const;

export function MerchantShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const user = getUser<{ fullName?: string }>();

  useEffect(() => {
    async function init() {
      if (!getToken()) {
        router.replace('/login');
        return;
      }
      const u = getUser<{ role?: string }>();
      if (u?.role !== 'platform_admin') {
        clearAuth();
        router.replace('/login');
        return;
      }
      const valid = await ensureValidSession();
      if (!valid) {
        router.replace('/login');
        return;
      }
      setReady(true);
    }
    setReady(false);
    init();
  }, [router, pathname]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="h-8 w-48" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 border-r border-border bg-card hidden md:flex flex-col">
        <div className="h-16 flex items-center gap-2 px-6 border-b border-border">
          <div className="h-8 w-8 rounded-lg bg-violet-600 text-white flex items-center justify-center font-bold">
            M
          </div>
          <span className="font-semibold text-sm">Merchant Panel</span>
        </div>
        <nav className="p-3 flex-1 space-y-1">
          {navItems.map((item) => {
            const active =
              item.href === '/dashboard'
                ? pathname === '/dashboard' || pathname.startsWith('/organizations')
                : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  active
                    ? 'bg-violet-600 text-white'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-border">
          <p className="text-xs text-muted-foreground px-3 mb-2">{user?.fullName ?? 'Platform admin'}</p>
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => {
              clearAuth();
              router.push('/login');
            }}
          >
            <LogOut className="h-4 w-4" />
            Chiqish
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <header className="h-16 border-b border-border bg-card/80 backdrop-blur flex items-center px-6 md:hidden">
          <Layers className="h-5 w-5 text-violet-600 mr-2" />
          <span className="font-semibold">Merchant Panel</span>
        </header>
        <div className="p-6 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
