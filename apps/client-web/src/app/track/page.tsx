'use client';

import { FormEvent, Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Search,
  Package,
  CheckCircle2,
  Clock,
  Truck,
  Building2,
  Sparkles,
} from 'lucide-react';
import { BottomNav } from '@/components/bottom-nav';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { ORDER_STATUS_LABELS, OrderStatus } from '@ximchistka/shared';
import { cn } from '@/lib/utils';

type TrackOrder = {
  orderNumber: string;
  status: OrderStatus;
  branch: { name: string };
  estimatedReady?: string | null;
  statusHistory: { status: OrderStatus; createdAt: string }[];
};

const statusOrder: OrderStatus[] = [
  'submitted',
  'received_at_branch',
  'in_processing',
  'ready',
  'completed',
];

const statusIcons: Record<OrderStatus, typeof Package> = {
  draft: Package,
  submitted: Package,
  received_at_branch: Building2,
  in_processing: Sparkles,
  ready: CheckCircle2,
  out_for_delivery: Truck,
  completed: CheckCircle2,
  cancelled: Clock,
};

export default function TrackPage() {
  return (
    <Suspense fallback={<div className="p-6">Yuklanmoqda...</div>}>
      <TrackContent />
    </Suspense>
  );
}

function TrackContent() {
  const params = useSearchParams();
  const [num, setNum] = useState(params.get('n') ?? '');
  const [order, setOrder] = useState<TrackOrder | null>(null);
  const [loading, setLoading] = useState(false);

  async function track(e?: FormEvent) {
    e?.preventDefault();
    if (!num) return;
    setLoading(true);
    try {
      const data = await api<TrackOrder>(`/orders/track/${num}`);
      setOrder(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Buyurtma topilmadi');
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (params.get('n')) track();
  }, []);

  const currentIdx = order ? statusOrder.indexOf(order.status) : -1;

  return (
    <div className="safe-bottom">
      <div className="bg-card border-b border-border px-5 py-6">
        <h1 className="text-2xl font-bold mb-1">Kuzatish</h1>
        <p className="text-sm text-muted-foreground mb-4">Buyurtma raqami orqali holatni tekshiring</p>

        <form onSubmit={track} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              className="pl-12"
              placeholder="XC-10001"
              value={num}
              onChange={(e) => setNum(e.target.value.toUpperCase())}
            />
          </div>
          <Button type="submit" loading={loading}>Kuzatish</Button>
        </form>
      </div>

      <div className="px-5 pt-4">
        {order && order.status !== 'cancelled' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="text-center mb-4 bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
              <div className="text-3xl font-bold mb-1">{order.orderNumber}</div>
              <div className="text-sm text-muted-foreground mb-3">{order.branch.name}</div>
              <div className="inline-block px-4 py-1.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                {ORDER_STATUS_LABELS[order.status]}
              </div>
              {order.estimatedReady && order.status !== 'completed' && (
                <div className="text-xs text-muted-foreground mt-3">
                  Tayyor bo&apos;ladi: {formatDate(order.estimatedReady, true)}
                </div>
              )}
            </Card>

            <Card>
              <h3 className="font-semibold mb-4">Buyurtma jarayoni</h3>
              <div className="relative">
                {statusOrder.map((s, i) => {
                  const Icon = statusIcons[s];
                  const reached = currentIdx >= i;
                  const isCurrent = currentIdx === i;
                  return (
                    <motion.div
                      key={s}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-start gap-3 pb-6 last:pb-0 relative"
                    >
                      {i < statusOrder.length - 1 && (
                        <div
                          className={cn(
                            'absolute left-[19px] top-10 bottom-0 w-0.5',
                            reached && currentIdx > i ? 'bg-primary' : 'bg-border',
                          )}
                        />
                      )}
                      <div
                        className={cn(
                          'h-10 w-10 rounded-full flex items-center justify-center shrink-0 relative z-10',
                          reached
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-secondary text-muted-foreground',
                          isCurrent && 'ring-4 ring-primary/20',
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 pt-1.5">
                        <div className={cn('font-semibold text-sm', !reached && 'text-muted-foreground')}>
                          {ORDER_STATUS_LABELS[s]}
                        </div>
                        {(() => {
                          const h = order.statusHistory.find((x) => x.status === s);
                          return h ? (
                            <div className="text-xs text-muted-foreground">
                              {formatDate(h.createdAt, true)}
                            </div>
                          ) : null;
                        })()}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </Card>
          </motion.div>
        )}

        {!order && !loading && (
          <Card className="text-center py-12">
            <Search className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <h3 className="font-semibold mb-1">Buyurtma raqamini kiriting</h3>
            <p className="text-sm text-muted-foreground">Masalan: XC-10001</p>
          </Card>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
