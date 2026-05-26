'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Sparkles,
  Plus,
  ChevronRight,
  Shirt,
  Wind,
  Sofa,
  ClipboardCheck,
  Search,
} from 'lucide-react';
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

const categories = [
  { icon: Shirt, label: "Ko'ylak", color: 'bg-blue-50 text-blue-600' },
  { icon: Wind, label: 'Palto', color: 'bg-violet-50 text-violet-600' },
  { icon: Sofa, label: 'Gilam', color: 'bg-amber-50 text-amber-600' },
  { icon: Sparkles, label: 'Boshqa', color: 'bg-emerald-50 text-emerald-600' },
];

export default function HomePage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[] | null>(null);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    api<{ data: Order[] }>('/orders?limit=3').then((r) => setOrders(r.data)).catch(console.error);
  }, [router]);

  return (
    <div className="safe-bottom">
      <div className="bg-gradient-to-br from-primary to-teal-600 text-white px-5 pt-10 pb-12 rounded-b-[2rem] relative overflow-hidden">
        <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />

        <div className="relative">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="text-sm text-teal-100">Xush kelibsiz</div>
              <div className="text-xl font-semibold">Ximchistka</div>
            </div>
            <Link href="/track" className="h-10 w-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
              <Search className="h-5 w-5" />
            </Link>
          </div>

          <h1 className="text-3xl font-bold leading-tight mb-2">
            Tezkor va ishonchli
            <br />
            kimyo tozalash
          </h1>
          <p className="text-teal-100 mb-6">24 soat ichida tayyor</p>

          <Link href="/order/new">
            <button className="w-full bg-white text-primary font-semibold rounded-2xl py-4 px-5 flex items-center justify-between shadow-lg shadow-black/10 active:scale-[0.98] transition-transform">
              <span className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Yangi buyurtma berish
              </span>
              <ChevronRight className="h-5 w-5" />
            </button>
          </Link>
        </div>
      </div>

      <div className="px-5 -mt-6 mb-6">
        <Card className="!p-3 shadow-lg">
          <div className="grid grid-cols-4 gap-2">
            {categories.map((c, i) => {
              const Icon = c.icon;
              return (
                <motion.div
                  key={c.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.05 }}
                >
                  <Link href="/order/new" className="flex flex-col items-center gap-2 py-2">
                    <div className={cn('h-12 w-12 rounded-2xl flex items-center justify-center', c.color)}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className="text-xs font-medium">{c.label}</span>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </Card>
      </div>

      <div className="px-5 mb-4 flex items-center justify-between">
        <h2 className="font-semibold text-base">Faol buyurtmalar</h2>
        <Link href="/orders" className="text-sm text-primary font-medium">
          Barchasi
        </Link>
      </div>

      <div className="px-5 space-y-3">
        {orders === null ? (
          <Card className="h-24 shimmer" />
        ) : orders.length === 0 ? (
          <Card className="text-center py-10">
            <ClipboardCheck className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <h3 className="font-semibold mb-1">Buyurtmalar yo&apos;q</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Birinchi buyurtmangizni hoziroq bering
            </p>
            <Link href="/order/new">
              <Button>Yangi buyurtma</Button>
            </Link>
          </Card>
        ) : (
          orders.map((o, i) => (
            <motion.div
              key={o.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05 }}
            >
              <Link href={`/track?n=${o.orderNumber}`}>
                <Card className="flex items-center justify-between hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                      {o.orderNumber.slice(-3)}
                    </div>
                    <div>
                      <div className="font-semibold text-sm">{o.orderNumber}</div>
                      <div className="text-xs text-muted-foreground">{o.branch.name}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-sm mb-1">{formatPrice(o.totalAmount)}</div>
                    <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', statusColors[o.status])}>
                      {ORDER_STATUS_LABELS[o.status]}
                    </span>
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
