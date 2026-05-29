'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Building2,
  MapPin,
  Phone,
  Clock,
  Wallet,
  ClipboardList,
  History,
  TrendingUp,
  Trash2,
  Settings,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { AppShell } from '@/components/layout/shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/badge';
import { api, formatPrice } from '@/lib/api';
import { formatRelative } from '@/lib/utils';
import { useRealtimeOrders } from '@/hooks/use-realtime-orders';
import { EditBranchForm } from '@/components/branches/edit-branch-form';
import { useCanEditBranch, useCanManageBranches } from '@/hooks/use-client-auth';
import type { OrderStatus } from '@ximchistka/shared';

type BranchFinance = {
  branch: {
    id: string;
    name: string;
    address: string;
    phone: string;
    openTime: string;
    closeTime: string;
    isActive: boolean;
  };
  summary: {
    totalOrders: number;
    completedOrders: number;
    totalRevenue: number;
    totalPaid: number;
    totalPending: number;
    avgOrder: number;
    collectionRate: number;
  };
  revenueByDay: { date: string; count: number; revenue: number }[];
  revenueHistory: {
    id: string;
    date: string;
    orderNumber: string;
    customerName: string;
    customerPhone: string;
    amount: number;
    status: OrderStatus;
    statusLabel: string;
    paidAmount: number;
  }[];
  paymentHistory: {
    id: string;
    date: string;
    orderId: string;
    orderNumber: string;
    customerName: string;
    provider: string;
    status: string;
    amount: number;
  }[];
  ledger: {
    id: string;
    kind: 'order' | 'payment';
    date: string;
    title: string;
    subtitle: string;
    amount: number;
    status: string;
    statusLabel: string;
    orderId: string;
    balanceAfter: number;
  }[];
};

type Tab = 'overview' | 'revenue' | 'payments' | 'ledger' | 'settings';

const tabs: { id: Tab; label: string; icon: typeof Wallet }[] = [
  { id: 'overview', label: 'Umumiy', icon: TrendingUp },
  { id: 'revenue', label: 'Tushumlar tarixi', icon: ClipboardList },
  { id: 'payments', label: 'To\'lovlar', icon: Wallet },
  { id: 'ledger', label: 'Foliyat tarixi', icon: History },
  { id: 'settings', label: 'Sozlamalar', icon: Settings },
];

export default function BranchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const canManage = useCanManageBranches();
  const canEdit = useCanEditBranch();
  const [tab, setTab] = useState<Tab>('overview');
  const [data, setData] = useState<BranchFinance | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [from, setFrom] = useState(new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));

  const load = useCallback(async () => {
    setData(null);
    try {
      const q = new URLSearchParams({ from, to });
      const res = await api<BranchFinance>(`/reports/branch/${id}/finance?${q}`);
      setData(res);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Filial ma\'lumotlarini yuklab bo\'lmadi');
    }
  }, [id, from, to]);

  useEffect(() => {
    load();
  }, [load]);

  useRealtimeOrders(load, true);

  async function deleteBranch() {
    if (!data?.branch.name) return;
    const ok = window.confirm(
      `"${data.branch.name}" filialini butunlay o'chirasizmi? Bu amalni qaytarib bo'lmaydi.`,
    );
    if (!ok) return;
    setDeleting(true);
    try {
      await api(`/branches/${id}`, { method: 'DELETE' });
      toast.success('Filial o\'chirildi');
      router.push('/branches');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Xatolik');
    } finally {
      setDeleting(false);
    }
  }

  const title = data?.branch.name ?? 'Filial';
  const visibleTabs = tabs.filter((t) => t.id !== 'settings' || canEdit);

  return (
    <AppShell title={title}>
      <div className="mb-4">
        <Link
          href="/branches"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Filiallar
        </Link>
      </div>

      {data === null ? (
        <Skeleton className="h-48 w-full mb-4" />
      ) : (
        <Card className="mb-4">
          <CardContent className="pt-6">
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
              <div className="flex gap-4">
                <div className="h-14 w-14 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Building2 className="h-7 w-7" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-bold">{data.branch.name}</h2>
                    {data.branch.isActive ? (
                      <Badge variant="success">Faol</Badge>
                    ) : (
                      <Badge variant="secondary">No&apos;faol</Badge>
                    )}
                  </div>
                  <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                      {data.branch.address}
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      {data.branch.phone}
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      {data.branch.openTime} – {data.branch.closeTime}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 items-end flex-wrap">
                <div>
                  <Label className="text-xs">Dan</Label>
                  <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Gacha</Label>
                  <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
                </div>
                <Button onClick={load} className="mt-5 sm:mt-0">
                  Yangilash
                </Button>
                {canManage && (
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-5 sm:mt-0 text-destructive border-destructive/40 hover:bg-destructive/10"
                    onClick={deleteBranch}
                    loading={deleting}
                  >
                    <Trash2 className="h-4 w-4" />
                    Filialni o&apos;chirish
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {data && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
            <Stat label="Buyurtmalar" value={String(data.summary.totalOrders)} />
            <Stat label="Jami tushum" value={formatPrice(data.summary.totalRevenue)} />
            <Stat label="To'langan" value={formatPrice(data.summary.totalPaid)} highlight />
            <Stat label="Kutilmoqda" value={formatPrice(data.summary.totalPending)} />
            <Stat label="Yig'ish %" value={`${data.summary.collectionRate}%`} />
          </div>

          <div className="flex flex-wrap gap-2 mb-4 border-b border-border pb-2">
            {visibleTabs.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    tab === t.id
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-secondary'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {t.label}
                </button>
              );
            })}
          </div>

          {tab === 'overview' && (
            <Card>
              <CardHeader>
                <CardTitle>Kunlik tushum</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  {data.revenueByDay.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={data.revenueByDay}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="date" fontSize={11} />
                        <YAxis fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                        <Tooltip formatter={(v: number) => formatPrice(v)} />
                        <Area type="monotone" dataKey="revenue" stroke="#2563eb" fill="#2563eb33" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center text-sm text-muted-foreground py-16">Ma&apos;lumot yo&apos;q</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {tab === 'revenue' && (
            <HistoryTable
              empty="Tushumlar tarixi bo'sh"
              headers={['Sana', 'Buyurtma', 'Mijoz', 'Summa', 'To\'langan', 'Holat']}
              rows={data.revenueHistory.map((r) => (
                <tr key={r.id} className="border-b border-border hover:bg-secondary/50">
                  <td className="px-4 py-3 text-xs text-muted-foreground">{formatRelative(r.date)}</td>
                  <td className="px-4 py-3">
                    <Link href={`/orders/${r.id}`} className="font-medium text-primary hover:underline">
                      {r.orderNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{r.customerName}</div>
                    <div className="text-xs text-muted-foreground">{r.customerPhone}</div>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">{formatPrice(r.amount)}</td>
                  <td className="px-4 py-3 text-right text-emerald-600">{formatPrice(r.paidAmount)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={r.status} label={r.statusLabel} />
                  </td>
                </tr>
              ))}
            />
          )}

          {tab === 'payments' && (
            <HistoryTable
              empty="To'lovlar tarixi bo'sh"
              headers={['Sana', 'Buyurtma', 'Mijoz', 'Provayder', 'Summa', 'Holat']}
              rows={data.paymentHistory.map((p) => (
                <tr key={p.id} className="border-b border-border hover:bg-secondary/50">
                  <td className="px-4 py-3 text-xs text-muted-foreground">{formatRelative(p.date)}</td>
                  <td className="px-4 py-3">
                    <Link href={`/orders/${p.orderId}`} className="font-medium text-primary hover:underline">
                      {p.orderNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{p.customerName}</td>
                  <td className="px-4 py-3 capitalize">{p.provider}</td>
                  <td className="px-4 py-3 text-right font-semibold">{formatPrice(p.amount)}</td>
                  <td className="px-4 py-3">
                    <Badge variant={p.status === 'paid' ? 'success' : 'warning'}>{p.status}</Badge>
                  </td>
                </tr>
              ))}
            />
          )}

          {tab === 'ledger' && (
            <HistoryTable
              empty="Foliyat tarixi bo'sh"
              headers={['Sana', 'Operatsiya', 'Summa', 'Balans', '']}
              rows={data.ledger.map((e) => (
                <tr key={e.id} className="border-b border-border hover:bg-secondary/50">
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {formatRelative(e.date)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-sm">{e.title}</div>
                    <div className="text-xs text-muted-foreground">{e.subtitle}</div>
                    <Badge variant="secondary" className="mt-1 text-[10px]">
                      {e.kind === 'payment' ? 'To\'lov' : 'Buyurtma'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-emerald-600">
                    +{formatPrice(e.amount)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    {e.kind === 'payment' ? formatPrice(e.balanceAfter) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/orders/${e.orderId}`}>
                      <Button size="sm" variant="ghost">
                        Ko&apos;rish
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            />
          )}

          {tab === 'settings' && (
            <Card>
              <CardHeader>
                <CardTitle>Filial ma&apos;lumotlari</CardTitle>
              </CardHeader>
              <CardContent>
                {canEdit ? (
                  <EditBranchForm
                    branch={data.branch}
                    canManage={canManage}
                    onSaved={load}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Tahrirlash uchun ruxsat yo&apos;q
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </AppShell>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <Card className={highlight ? 'border-primary/30 bg-primary/5' : ''}>
      <CardContent className="pt-4 pb-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-bold mt-1">{value}</p>
      </CardContent>
    </Card>
  );
}

function HistoryTable({
  headers,
  rows,
  empty,
}: {
  headers: string[];
  rows: React.ReactNode[];
  empty: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6 p-0">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">{empty}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  {headers.map((h) => (
                    <th key={h} className="text-left font-medium px-4 py-3 last:text-right">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>{rows}</tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
