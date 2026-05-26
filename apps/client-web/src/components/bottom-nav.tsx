'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Plus, ClipboardList, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

const links = [
  { href: '/home', label: 'Bosh', icon: Home },
  { href: '/orders', label: 'Tarix', icon: ClipboardList },
  { href: '/order/new', label: 'Buyurtma', icon: Plus, primary: true },
  { href: '/track', label: 'Kuzatish', icon: Search },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/90 backdrop-blur-lg"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex max-w-md mx-auto">
        {links.map((l) => {
          const active = pathname.startsWith(l.href);
          const Icon = l.icon;
          if (l.primary) {
            return (
              <Link key={l.href} href={l.href} className="flex-1 flex justify-center py-3">
                <div
                  className={cn(
                    'h-12 w-12 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30',
                    'bg-primary text-primary-foreground -mt-6',
                  )}
                >
                  <Icon className="h-6 w-6" />
                </div>
              </Link>
            );
          }
          return (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                'flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors',
                active ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              <Icon className="h-5 w-5" />
              {l.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
