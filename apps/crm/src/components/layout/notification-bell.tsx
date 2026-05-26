'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell, CheckCheck, Wallet } from 'lucide-react';
import { useAdminNotifications } from '@/hooks/use-admin-notifications';
import { formatPrice } from '@/lib/api';
import { formatRelative } from '@/lib/utils';
import type { AdminRevenueNotification } from '@/lib/admin-notifications';

const typeLabels: Record<AdminRevenueNotification['type'], string> = {
  order_created: 'Yangi buyurtma',
  order_received: 'Filial qabul qildi',
  order_completed: 'Yakunlandi',
  payment_received: 'To\'lov',
};

export function NotificationBell() {
  const { items, unread, enabled, markRead, markAllRead } = useAdminNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  if (!enabled) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative h-9 w-9 inline-flex items-center justify-center rounded-lg border border-border bg-card hover:bg-secondary"
        aria-label="Bildirishnomalar"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[min(100vw-2rem,380px)] rounded-xl border border-border bg-card shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div>
              <p className="font-semibold text-sm">Tushum bildirishnomalari</p>
              <p className="text-xs text-muted-foreground">Jonli yangilanish</p>
            </div>
            {unread > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-xs text-primary hover:underline inline-flex items-center gap-1"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                O&apos;qildi
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10 px-4">
                Hozircha bildirishnoma yo&apos;q
              </p>
            ) : (
              items.map((n) => (
                <Link
                  key={n.id}
                  href={`/orders/${n.orderId}`}
                  onClick={() => {
                    markRead(n.id);
                    setOpen(false);
                  }}
                  className={`block px-4 py-3 border-b border-border last:border-0 hover:bg-secondary/60 transition-colors ${
                    n.read ? 'opacity-70' : 'bg-primary/5'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="h-9 w-9 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                      <Wallet className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium truncate">{n.title}</p>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {formatRelative(n.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        <span className="text-xs font-semibold text-primary">{formatPrice(n.amount)}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                          {typeLabels[n.type]}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                          {n.statusLabel}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
