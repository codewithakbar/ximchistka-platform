'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ClipboardList, ChevronRight, Plus } from 'lucide-react';
import { BottomNav } from '@/components/bottom-nav';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api, formatPrice, getToken } from '@/lib/api';
import { ORDER_STATUS_LABELS, OrderStatus } from '@ximchistka/shared';
import { cn } from '@/lib/utils';

type Order = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  totalAmount: number;
  createdAt: string;
  branch: { name: string };
};

const statusColors: Record<OrderStatus, string> = {
  draft: 'bg-slate-100 text-slate-700',
  submitted: 'bg-blue-100 text-blue-700',
  received_at_branch: 'bg-indigo-100 text-indigo-700',
  in_processing: 'bg-amber-100 text-amber-700',
  ready: 'bg-emerald-100 text-emerald-700',
  out_for_delivery: 'bg-violet-100 text-violet-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
};

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[] | null>(null);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    api<{ data: Order[] }>('/orders').then((r) => setOrders(r.data));
  }, [router]);

  return (
    <div className="safe-bottom">
      <div className="bg-card border-b border-border px-5 py-6 sticky top-0 z-20">
        <h1 className="text-2xl font-bold">Buyurtmalar</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {orders ? `Jami ${orders.length} ta` : ''}
        </p>
      </div>

      <div className="px-5 pt-4 space-y-3">
        {orders === null ? (
          Array.from({ length: 3 }).map((_, i) => <Card key={i} className="h-20 shimmer" />)
        ) : orders.length === 0 ? (
          <Card className="text-center py-12">
            <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <h3 className="font-semibold mb-1">Buyurtmalar yo&apos;q</h3>
            <p className="text-sm text-muted-foreground mb-4">Birinchi buyurtmangizni bering</p>
            <Link href="/order/new">
              <Button>
                <Plus className="h-4 w-4" />
                Yangi buyurtma
              </Button>
            </Link>
          </Card>
        ) : (
          orders.map((o, i) => (
            <motion.div
              key={o.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link href={`/track?n=${o.orderNumber}`}>
                <Card className="flex items-center gap-3 hover:shadow-md transition-shadow">
                  <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">
                    {o.orderNumber.slice(-3)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold">{o.orderNumber}</div>
                    <div className="text-xs text-muted-foreground truncate">{o.branch.name}</div>
                    <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full inline-block mt-1', statusColors[o.status])}>
                      {ORDER_STATUS_LABELS[o.status]}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold text-sm">{formatPrice(o.totalAmount)}</div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground inline-block mt-1" />
                  </div>
                </Card>
              </Link>
            </motion.div>
          ))
        )}
      </div>

      <BottomNav />
    </div>
  );
}
