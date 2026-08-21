'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Search, Filter, ClipboardList, ArrowRight, Eye, Plus, Printer } from 'lucide-react';
import { useCanCreateOrders } from '@/hooks/use-client-auth';
import { AppShell } from '@/components/layout/shell';
import { useDemoExpired } from '@/components/layout/demo-expired-lock';
import { Card, CardContent } from '@/components/ui/card';
import { Input, Select } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Empty } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { api, formatPrice } from '@/lib/api';
import { useFormatRelative, useI18n, useOrderStatusLabel } from '@/lib/i18n';
import {
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
  payments?: { status: string; amount: number }[];
};

/** Buyurtma bo'yicha to'langan summa (qaytarilganlar hisobga olinmaydi) */
function paidAmountOf(order: Order) {
  return (order.payments ?? [])
    .filter((p) => p.status === 'paid')
    .reduce((sum, p) => sum + p.amount, 0);
}

const ALL_STATUSES: OrderStatus[] = [
  'draft',
  'submitted',
  'received_at_branch',
  'in_processing',
  'ready',
  'out_for_delivery',
  'completed',
  'cancelled',
];

const nextActionKeys: Partial<Record<OrderStatus, string>> = {
  submitted: 'orders.actionAccept',
  received_at_branch: 'orders.actionProcess',
  in_processing: 'orders.actionReady',
  ready: 'orders.actionDeliver',
  out_for_delivery: 'orders.actionComplete',
};

export default function OrdersPage() {
  const { t } = useI18n();
  const statusLabel = useOrderStatusLabel();
  const formatRelative = useFormatRelative();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [pending, setPending] = useState<{ id: string; next: OrderStatus } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const canCreate = useCanCreateOrders();
  const demoExpired = useDemoExpired();
  const canCreateNew = canCreate && !demoExpired;

  // Kech kelgan eski javob yangi natijani bosib qo'ymasligi uchun
  const loadSeqRef = useRef(0);

  async function load() {
    const seq = ++loadSeqRef.current;
    // Qidiruv yangilanishida jadval bo'shatilmaydi — skeleton faqat birinchi
    // yuklanishda ko'rinadi, yozish paytida eski natijalar turadi
    try {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (search.trim()) params.set('q', search.trim());
      const qs = params.toString();
      const r = await api<{ data: Order[] }>(`/orders${qs ? `?${qs}` : ''}`);
      if (seq === loadSeqRef.current) setOrders(r.data);
    } catch (e) {
      if (seq !== loadSeqRef.current) return;
      const msg = e instanceof Error ? e.message : t('common.error');
      if (!msg.includes('Sessiya tugadi')) {
        toast.error(msg);
      }
      setOrders([]);
    }
  }

  useEffect(() => {
    // Qidiruv serverda bajariladi — yozish tugagach 350ms kutamiz
    const timer = window.setTimeout(load, search ? 350 : 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, search]);

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
      toast.success(t('orders.toastStatusChanged', { status: statusLabel(pending.next) }));
      setOrders(
        (prev) => prev?.map((o) => (o.id === pending.id ? { ...o, status: pending.next } : o)) ?? null,
      );
      setPending(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('common.error'));
    } finally {
      setConfirming(false);
    }
  }

  const filtered = orders;

  return (
    <AppShell title={t('orders.title')}>
      {canCreateNew && (
        <div className="flex justify-end mb-4">
          <Link href="/orders/new">
            <Button>
              <Plus className="h-4 w-4" />
              {t('orders.newOrder')}
            </Button>
          </Link>
        </div>
      )}
      <Card className="mb-4">
        <CardContent className="pt-6 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('orders.searchServer')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="relative md:w-56">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Select value={status} onChange={(e) => setStatus(e.target.value)} className="pl-10">
              <option value="">{t('orders.allStatuses')}</option>
              {ALL_STATUSES.map((k) => (
                <option key={k} value={k}>{statusLabel(k)}</option>
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
              title={t('orders.emptyTitle')}
              description={t('orders.emptyDescription')}
              action={
                canCreateNew ? (
                  <Link href="/orders/new">
                    <Button>
                      <Plus className="h-4 w-4" />
                      {t('orders.newOrder')}
                    </Button>
                  </Link>
                ) : undefined
              }
            />
          ) : (
            <div className="overflow-x-auto -mx-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="text-left font-medium px-6 py-3">{t('orders.colOrder')}</th>
                    <th className="text-left font-medium px-6 py-3">{t('orders.colCustomer')}</th>
                    <th className="text-left font-medium px-6 py-3">{t('orders.colBranch')}</th>
                    <th className="text-right font-medium px-6 py-3">{t('orders.colAmount')}</th>
                    <th className="text-left font-medium px-6 py-3">{t('orders.colStatus')}</th>
                    <th className="text-left font-medium px-6 py-3">{t('orders.colDate')}</th>
                    <th className="text-right font-medium px-6 py-3">{t('orders.colActions')}</th>
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
                      <td className="px-6 py-3 text-right">
                        <div className="font-semibold">{formatPrice(o.totalAmount)}</div>
                        {o.status !== 'cancelled' && o.totalAmount > 0 && (() => {
                          const paid = paidAmountOf(o);
                          if (paid >= o.totalAmount) {
                            return (
                              <Badge variant="success" className="mt-1 px-1.5 py-0 text-[10px]">
                                {t('payments.status.paid')}
                              </Badge>
                            );
                          }
                          return (
                            <Badge
                              variant={paid > 0 ? 'warning' : 'secondary'}
                              className="mt-1 px-1.5 py-0 text-[10px]"
                            >
                              {paid > 0 ? t('payments.partial') : t('payments.unpaid')}
                            </Badge>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-3">
                        <StatusBadge status={o.status} label={statusLabel(o.status)} />
                      </td>
                      <td className="px-6 py-3 text-muted-foreground text-xs">{formatRelative(o.createdAt)}</td>
                      <td className="px-6 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {nextActionKeys[o.status] && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => requestAdvance(o.id, o.status)}
                            >
                              {t(nextActionKeys[o.status]!)}
                              <ArrowRight className="h-3 w-3" />
                            </Button>
                          )}
                          <Link href={`/orders/${o.id}/receipt`} title={t('orders.viewReceipt')}>
                            <Button size="icon" variant="ghost">
                              <Printer className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Link href={`/orders/${o.id}`} title={t('orders.viewOrder')}>
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

      <ConfirmDialog
        open={pending !== null}
        title={t('orders.confirmStatusTitle')}
        description={
          pending ? (
            <>
              {t('orders.confirmStatusDescription', { status: statusLabel(pending.next) })}
            </>
          ) : null
        }
        confirmLabel={t('common.yesChange')}
        loading={confirming}
        onConfirm={confirmAdvance}
        onCancel={() => setPending(null)}
      />
    </AppShell>
  );
}
