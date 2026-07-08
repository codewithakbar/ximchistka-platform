'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  ClipboardList,
  Wallet,
  CheckCircle2,
  Clock,
  Printer,
} from 'lucide-react';
import { toast } from 'sonner';
import { AppShell } from '@/components/layout/shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { api, formatPrice } from '@/lib/api';
import {
  useFormatDate,
  useFormatRelative,
  useI18n,
  useOrderStatusLabel,
} from '@/lib/i18n';
import { OrderStatus } from '@ximchistka/shared';

type CustomerDetail = {
  id: string;
  notes: string | null;
  registeredAt: string;
  user: { id: string; fullName: string; phone: string; email: string | null };
  addresses: { id: string; label: string; address: string; isDefault: boolean }[];
  summary: {
    totalOrders: number;
    completedOrders: number;
    activeOrders: number;
    totalSpent: number;
    avgOrder: number;
  };
  orders: {
    id: string;
    orderNumber: string;
    status: OrderStatus;
    totalAmount: number;
    discountAmount: number;
    createdAt: string;
    updatedAt: string;
    branch: { id: string; name: string };
    paidAmount: number;
  }[];
};

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { t } = useI18n();
  const formatDate = useFormatDate();
  const formatRelative = useFormatRelative();
  const statusLabel = useOrderStatusLabel();
  const { id } = use(params);
  const [data, setData] = useState<CustomerDetail | null>(null);

  const load = useCallback(async () => {
    setData(null);
    try {
      const res = await api<CustomerDetail>(`/customers/${id}`);
      setData(res);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('customerDetail.toastLoadError'));
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const title = data?.user.fullName ?? t('common.customer');

  return (
    <AppShell title={title}>
      <div className="mb-4">
        <Link
          href="/customers"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('nav./customers')}
        </Link>
      </div>

      {data === null ? (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <>
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-2xl font-bold shrink-0">
                  {data.user.fullName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-bold">{data.user.fullName}</h2>
                  <div className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 shrink-0" />
                      {data.user.phone}
                    </div>
                    {data.user.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 shrink-0" />
                        {data.user.email}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 shrink-0" />
                      {t('customerDetail.registered')}: {formatDate(data.registeredAt)}
                    </div>
                  </div>
                  {data.notes && (
                    <p className="mt-3 text-sm rounded-lg bg-secondary p-3">{data.notes}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <StatCard icon={ClipboardList} label={t('orders.title')} value={String(data.summary.totalOrders)} />
            <StatCard
              icon={CheckCircle2}
              label={t('customerDetail.completed')}
              value={String(data.summary.completedOrders)}
            />
            <StatCard icon={Clock} label={t('customerDetail.active')} value={String(data.summary.activeOrders)} />
            <StatCard icon={Wallet} label={t('customerDetail.totalSpent')} value={formatPrice(data.summary.totalSpent)} />
          </div>

          {data.addresses.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {t('customerDetail.addresses')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.addresses.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-start justify-between gap-2 rounded-lg border border-border p-3"
                  >
                    <div>
                      <div className="font-medium text-sm">{a.label}</div>
                      <div className="text-sm text-muted-foreground">{a.address}</div>
                    </div>
                    {a.isDefault && <Badge variant="info">{t('customerDetail.defaultAddress')}</Badge>}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                {t('customerDetail.orderHistory')}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {t('customerDetail.avgOrder')}: {formatPrice(data.summary.avgOrder)}
              </p>
            </CardHeader>
            <CardContent className="p-0">
              {data.orders.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-12">
                  {t('orders.emptyTitle')}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground">
                        <th className="text-left font-medium px-4 py-3">{t('orders.colOrder')}</th>
                        <th className="text-left font-medium px-4 py-3">{t('common.branch')}</th>
                        <th className="text-left font-medium px-4 py-3">{t('common.date')}</th>
                        <th className="text-right font-medium px-4 py-3">{t('common.amount')}</th>
                        <th className="text-left font-medium px-4 py-3">{t('common.state')}</th>
                        <th className="text-right font-medium px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {data.orders.map((o) => (
                        <tr
                          key={o.id}
                          className="border-b border-border last:border-0 hover:bg-secondary/50"
                        >
                          <td className="px-4 py-3 font-medium">{o.orderNumber}</td>
                          <td className="px-4 py-3 text-muted-foreground">{o.branch.name}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                            <div>{formatRelative(o.createdAt)}</div>
                            <div>{formatDate(o.createdAt, true)}</div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="font-semibold">{formatPrice(o.totalAmount)}</div>
                            {o.discountAmount > 0 && (
                              <div className="text-xs text-emerald-600">
                                -{formatPrice(o.discountAmount)} chegirma
                              </div>
                            )}
                            {o.paidAmount > 0 && (
                              <div className="text-xs text-muted-foreground">
                                {t('common.paid')}: {formatPrice(o.paidAmount)}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge
                              status={o.status}
                              label={statusLabel(o.status)}
                            />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Link href={`/orders/${o.id}/receipt`} title={t('orders.viewReceipt')}>
                                <Button size="sm" variant="ghost">
                                  <Printer className="h-4 w-4" />
                                </Button>
                              </Link>
                              <Link href={`/orders/${o.id}`}>
                                <Button size="sm" variant="ghost">
                                  {t('orders.viewOrder')}
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
        </>
      )}
    </AppShell>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof ClipboardList;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          <Icon className="h-4 w-4" />
          <span className="text-xs">{label}</span>
        </div>
        <div className="text-lg font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}
