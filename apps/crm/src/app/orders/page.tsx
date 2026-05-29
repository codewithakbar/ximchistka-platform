'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Search, Filter, ClipboardList, ArrowRight, Eye, Plus, Printer } from 'lucide-react';
import { CreateOrderDialog } from '@/components/orders/create-order-dialog';
import { useCanCreateOrders } from '@/hooks/use-client-auth';
import { AppShell } from '@/components/layout/shell';
import { Card, CardContent } from '@/components/ui/card';
import { Input, Select } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Empty } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { api, formatPrice } from '@/lib/api';
import { formatRelative } from '@/lib/utils';
import {
  ORDER_STATUS_LABELS,
  OrderStatus,
  VALID_STATUS_TRANSITIONS,
} from '@ximchistka/shared';

type Order = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  totalAmount: number;
  createdAt: string;
  branch: { name: string };
  customer: { user: { fullName: string; phone: string } };
};

const nextActionLabel: Partial<Record<OrderStatus, string>> = {
  submitted: 'Qabul',
  received_at_branch: 'Ishlash',
  in_processing: 'Tayyor',
  ready: 'Yetkazish',
  out_for_delivery: 'Yakunlash',
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [pending, setPending] = useState<{ id: string; next: OrderStatus } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const canCreate = useCanCreateOrders();

  async function load() {
    setOrders(null);
    try {
      const q = status ? `?status=${status}` : '';
      const r = await api<{ data: Order[] }>(`/orders${q}`);
      setOrders(r.data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Xatolik';
      if (!msg.includes('Sessiya tugadi')) {
        toast.error(msg);
      }
      setOrders([]);
    }
  }

  useEffect(() => {
    load();
  }, [status]);

  function requestAdvance(id: string, current: OrderStatus) {
    const next = VALID_STATUS_TRANSITIONS[current]?.[0];
    if (!next) return;
    setPending({ id, next });
  }

  async function confirmAdvance() {
    if (!pending) return;
    setConfirming(true);
    try {
      await api(`/orders/${pending.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: pending.next }),
      });
      toast.success(`Status: ${ORDER_STATUS_LABELS[pending.next]}`);
      setOrders(
        (prev) => prev?.map((o) => (o.id === pending.id ? { ...o, status: pending.next } : o)) ?? null,
      );
      setPending(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Xatolik');
    } finally {
      setConfirming(false);
    }
  }

  const filtered = orders?.filter((o) =>
    !search ? true :
    o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
    o.customer.user.fullName.toLowerCase().includes(search.toLowerCase()) ||
    o.customer.user.phone.includes(search),
  );

  return (
    <AppShell title="Buyurtmalar">
      {canCreate && (
        <div className="flex justify-end mb-4">
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Yangi buyurtma
          </Button>
        </div>
      )}
      <Card className="mb-4">
        <CardContent className="pt-6 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buyurtma raqami, mijoz ismi yoki telefon..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="relative md:w-56">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Select value={status} onChange={(e) => setStatus(e.target.value)} className="pl-10">
              <option value="">Barcha statuslar</option>
              {Object.entries(ORDER_STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {orders === null ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filtered?.length === 0 ? (
            <Empty
              icon={ClipboardList}
              title="Buyurtmalar topilmadi"
              description="Filterni o'zgartiring yoki yangi buyurtma yarating"
              action={
                canCreate ? (
                  <Button onClick={() => setCreateOpen(true)}>
                    <Plus className="h-4 w-4" />
                    Yangi buyurtma
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="overflow-x-auto -mx-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="text-left font-medium px-6 py-3">Buyurtma</th>
                    <th className="text-left font-medium px-6 py-3">Mijoz</th>
                    <th className="text-left font-medium px-6 py-3">Filial</th>
                    <th className="text-right font-medium px-6 py-3">Summa</th>
                    <th className="text-left font-medium px-6 py-3">Status</th>
                    <th className="text-left font-medium px-6 py-3">Sana</th>
                    <th className="text-right font-medium px-6 py-3">Amallar</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered?.map((o) => (
                    <tr key={o.id} className="border-b border-border last:border-0 hover:bg-secondary/50">
                      <td className="px-6 py-3">
                        <Link href={`/orders/${o.id}`} className="font-medium text-primary hover:underline">
                          {o.orderNumber}
                        </Link>
                      </td>
                      <td className="px-6 py-3">
                        <div className="font-medium">{o.customer.user.fullName}</div>
                        <div className="text-xs text-muted-foreground">{o.customer.user.phone}</div>
                      </td>
                      <td className="px-6 py-3 text-muted-foreground">{o.branch.name}</td>
                      <td className="px-6 py-3 text-right font-semibold">{formatPrice(o.totalAmount)}</td>
                      <td className="px-6 py-3">
                        <StatusBadge status={o.status} label={ORDER_STATUS_LABELS[o.status]} />
                      </td>
                      <td className="px-6 py-3 text-muted-foreground text-xs">{formatRelative(o.createdAt)}</td>
                      <td className="px-6 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {nextActionLabel[o.status] && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => requestAdvance(o.id, o.status)}
                            >
                              {nextActionLabel[o.status]}
                              <ArrowRight className="h-3 w-3" />
                            </Button>
                          )}
                          <Link href={`/orders/${o.id}/receipt`} title="Chek">
                            <Button size="icon" variant="ghost">
                              <Printer className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Link href={`/orders/${o.id}`} title="Ko'rish">
                            <Button size="icon" variant="ghost">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <CreateOrderDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(order) => {
          load();
          if (order?.id) {
            window.open(`/orders/${order.id}/receipt?print=1`, '_blank');
          }
        }}
      />

      <ConfirmDialog
        open={pending !== null}
        title="Statusni o'zgartirish"
        description={
          pending ? (
            <>
              Buyurtma statusini{' '}
              <strong className="text-foreground">{ORDER_STATUS_LABELS[pending.next]}</strong> ga
              o&apos;zgartirishni tasdiqlaysizmi?
            </>
          ) : null
        }
        confirmLabel="Ha, o'zgartirish"
        loading={confirming}
        onConfirm={confirmAdvance}
        onCancel={() => setPending(null)}
      />
    </AppShell>
  );
}
